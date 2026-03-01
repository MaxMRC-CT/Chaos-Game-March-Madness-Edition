"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  getMaxDraftPicks,
  getRoleForPick,
  getSnakeDraftPosition,
} from "@/lib/draft/rules";
import { redirect } from "next/navigation";

type ActionState = { error?: string } | null;

function isRedirectError(err: unknown) {
  if (typeof err !== "object" || err === null) return false;
  const maybeDigest = (err as { digest?: unknown }).digest;
  return typeof maybeDigest === "string" && maybeDigest.startsWith("NEXT_REDIRECT");
}

function shuffleIds(ids: string[]) {
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export async function startDraft(leagueId: string): Promise<ActionState> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value;
  if (!memberId) {
    return { error: "Not authorized" };
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, status: true },
  });

  if (!league) {
    return { error: "League not found" };
  }

  if (league.status !== "SETUP") {
    return { error: "Draft can only be started from setup" };
  }

  const actingMember = await prisma.leagueMember.findFirst({
    where: {
      id: memberId,
      leagueId,
    },
    select: { isAdmin: true },
  });

  if (!actingMember?.isAdmin) {
    return { error: "Not authorized" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.draftPick.deleteMany({ where: { leagueId } });
    await tx.leagueEvent.deleteMany({
      where: {
        leagueId,
        type: { in: ["DRAFT_PICK_MADE", "DRAFT_COMPLETE"] },
      },
    });

    const members = await tx.leagueMember.findMany({
      where: { leagueId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    const shuffledMemberIds = shuffleIds(members.map((member) => member.id));

    await Promise.all(
      shuffledMemberIds.map((memberId, index) =>
        tx.leagueMember.update({
          where: { id: memberId },
          data: { draftPosition: index + 1 },
        }),
      ),
    );

    await tx.league.update({
      where: { id: leagueId },
      data: {
        status: "DRAFT",
        currentPick: 1,
      },
    });
  });

  redirect(`/league/${leagueId}/draft`);
}

export async function startDraftFromForm(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) {
    return { error: "League not found" };
  }

  return startDraft(leagueId);
}

export async function makePick(
  leagueId: string,
  teamId: string,
  requestedRole?: "HERO" | "VILLAIN" | "CINDERELLA",
) {
  const selectedTeamId = teamId.trim();
  if (!selectedTeamId) {
    throw new Error("Team is required");
  }

  const memberCookieKey = `cl_member_${leagueId}`;
  const cookieStore = await cookies();
  const memberId = cookieStore.get(memberCookieKey)?.value;

  if (!memberId) {
    throw new Error("Member cookie missing for this league");
  }

  let redirectPath = `/league/${leagueId}/draft`;

  await prisma.$transaction(async (tx) => {
    const league = await tx.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        status: true,
        currentPick: true,
        tournamentYearId: true,
      },
    });

    if (!league) {
      throw new Error("League not found");
    }

    if (league.status !== "DRAFT") {
      throw new Error("Draft is not active");
    }

    const team = await tx.team.findFirst({
      where: {
        id: selectedTeamId,
        tournamentYearId: league.tournamentYearId,
      },
      select: { id: true },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    const existingPick = await tx.draftPick.findFirst({
      where: { leagueId, teamId: selectedTeamId },
      select: { id: true },
    });

    if (existingPick) {
      throw new Error("Team already picked");
    }

    const members = await tx.leagueMember.findMany({
      where: { leagueId, draftPosition: { not: null } },
      select: { id: true, draftPosition: true },
      orderBy: { draftPosition: "asc" },
    });

    if (members.length === 0) {
      throw new Error("Draft order is not set");
    }

    const existingPicksCount = await tx.draftPick.count({
      where: { leagueId },
    });
    const currentOverallPickNumber = existingPicksCount + 1;
    const maxDraftPicks = getMaxDraftPicks(members.length);
    if (currentOverallPickNumber > maxDraftPicks) {
      throw new Error("Draft is already complete");
    }

    const expectedDraftPosition = getSnakeDraftPosition(
      currentOverallPickNumber,
      members.length,
    );

    if (!expectedDraftPosition) {
      throw new Error("Could not determine draft position");
    }

    const expectedRole = getRoleForPick(currentOverallPickNumber, members.length);
    if (requestedRole && requestedRole !== expectedRole) {
      throw new Error(`This pick must be a ${expectedRole}`);
    }

    const currentDrafter = members.find(
      (member) => member.draftPosition === expectedDraftPosition,
    );

    if (!currentDrafter) {
      throw new Error("Could not determine current drafter");
    }

    if (currentDrafter.id !== memberId) {
      throw new Error("It is not this member's turn");
    }

    await tx.draftPick.create({
      data: {
        leagueId,
        memberId: currentDrafter.id,
        teamId: selectedTeamId,
        role: expectedRole,
        pickNumber: currentOverallPickNumber,
      },
    });

    await tx.leagueEvent.create({
      data: {
        leagueId,
        type: "DRAFT_PICK_MADE",
        payload: {
          pickNumber: currentOverallPickNumber,
          role: expectedRole,
          memberId: currentDrafter.id,
          teamId: selectedTeamId,
        },
      },
    });

    const nextOverallPickNumber = currentOverallPickNumber + 1;
    const nextPosition = getSnakeDraftPosition(nextOverallPickNumber, members.length);
    const isDraftComplete = currentOverallPickNumber >= maxDraftPicks;

    await tx.league.update({
      where: { id: leagueId },
      data: isDraftComplete
        ? {
            status: "LIVE",
          }
        : {
            currentPick: nextPosition ?? league.currentPick,
          },
    });

    if (isDraftComplete) {
      await tx.leagueEvent.create({
        data: {
          leagueId,
          type: "DRAFT_COMPLETE",
          payload: {
            totalPicks: currentOverallPickNumber,
          },
        },
      });

      redirectPath = `/league/${leagueId}/dashboard`;
    }
  });

  redirect(redirectPath);
}

export async function makePickFromForm(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const role = String(formData.get("role") || "").trim() as
    | "HERO"
    | "VILLAIN"
    | "CINDERELLA"
    | "";

  if (!leagueId) {
    return { error: "League not found" };
  }

  if (!teamId) {
    return { error: "Choose a team first" };
  }

  try {
    await makePick(leagueId, teamId, role || undefined);
    return null;
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Could not submit pick",
    };
  }
}
