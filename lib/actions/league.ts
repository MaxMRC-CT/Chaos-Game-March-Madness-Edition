"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateLeagueCode } from "@/lib/league/pin";
import { makeNicknameKey, normalizeDisplayName } from "@/lib/league/nickname";
import { generateReconnectCode } from "@/lib/utils/reconnect";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type ActionState =
  | {
      error?: string;
      reconnectCode?: string;
      leagueId?: string;
      leagueName?: string;
      leagueCode?: string;
      playerId?: string;
      nickname?: string;
      deviceToken?: string;
      success?: boolean;
    }
  | null;

function isRedirectError(err: unknown) {
  if (typeof err !== "object" || err === null) return false;
  const maybeDigest = (err as { digest?: unknown }).digest;
  return typeof maybeDigest === "string" && maybeDigest.startsWith("NEXT_REDIRECT");
}

async function generateUniqueReconnectCode() {
  for (let i = 0; i < 10; i += 1) {
    const reconnectCode = generateReconnectCode();
    const existing = await prisma.leagueMember.findUnique({
      where: { reconnectCode },
      select: { id: true },
    });
    if (!existing) return reconnectCode;
  }

  throw new Error("Failed to generate reconnect code");
}

/* ============================================================
   CREATE LEAGUE
============================================================ */

export async function createLeague(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("League name is required");

  const rawDisplayName = String(formData.get("displayName") || "").trim();
  const displayName = normalizeDisplayName(rawDisplayName);
  if (!displayName) throw new Error("Your name is required to create a league");

  const defaultYear = 2026;
  const year = await prisma.tournamentYear.findUnique({
    where: { year: defaultYear },
  });

  if (!year) throw new Error(`TournamentYear ${defaultYear} not found. Run seed.`);

  const code = await generateLeagueCode();

  const league = await prisma.league.create({
    data: {
      name,
      code,
      status: "SETUP",
      tournamentYearId: year.id,
    },
  });
  const nicknameKey = makeNicknameKey(displayName);
  const reconnectCode = await generateUniqueReconnectCode();
  const deviceToken = crypto.randomUUID();

  const member = await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      nickname: displayName,
      displayName,
      nicknameKey,
      reconnectCode,
      deviceToken,
      isAdmin: true,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(`cl_member_${league.id}`, member.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(`/league/${league.id}/dashboard`);
}

/* ============================================================
   JOIN LEAGUE
============================================================ */

export async function joinLeague(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;

  const code = String(formData.get("code") || "").trim();
  const rawNickname = String(formData.get("nickname") || "");

  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter a valid 6-digit Game PIN" };
  }

  const displayName = normalizeDisplayName(rawNickname);
  if (!displayName) {
    return { error: "Nickname is required" };
  }

  const nicknameKey = makeNicknameKey(displayName);

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, name: true, code: true, status: true },
  });

  if (!league) {
    return { error: "Game PIN not found" };
  }

  /* 🚫 BLOCK JOIN IF LOCKED, DRAFT, LIVE, OR COMPLETE (only allow during SETUP) — unless beta override */
  const allowBetaJoinAfterStart = process.env.NEXT_PUBLIC_ALLOW_BETA_JOIN_AFTER_START === "true";
  const statusBlocksJoin =
    league.status === "LOCKED" || league.status === "DRAFT" || league.status === "LIVE" || league.status === "COMPLETE";
  if (statusBlocksJoin && !allowBetaJoinAfterStart) {
    return {
      error: "Joining is closed. This league has started—please reconnect if you already joined.",
    };
  }

  try {
    const existing = await prisma.leagueMember.findFirst({
      where: {
        leagueId: league.id,
        nicknameKey,
      },
      select: { id: true },
    });

    if (existing) {
      return { error: "That nickname is already taken in this league." };
    }

    const reconnectCode = await generateUniqueReconnectCode();
    const deviceToken = crypto.randomUUID();

    const member = await prisma.leagueMember.create({
      data: {
        leagueId: league.id,
        nickname: displayName,
        displayName,
        nicknameKey,
        reconnectCode,
        deviceToken,
        isAdmin: false,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(`cl_member_${league.id}`, member.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return {
      success: true,
      reconnectCode,
      leagueId: league.id,
      leagueName: league.name,
      leagueCode: league.code,
      playerId: member.id,
      nickname: member.displayName,
      deviceToken,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;

    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { error: "That nickname is already taken in this league." };
    }

    console.error("joinLeague failed:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

/* ============================================================
   RECONNECT MEMBER
============================================================ */

export async function reconnectMember(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;

  const code = String(formData.get("code") || "").trim();
  const rawNickname = String(formData.get("nickname") || "");
  const reconnectCode = String(formData.get("reconnectCode") || "")
    .trim()
    .toUpperCase();
  const deviceToken = String(formData.get("deviceToken") || "").trim();

  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter a valid 6-digit Game PIN" };
  }

  const displayName = normalizeDisplayName(rawNickname);
  if (!displayName) {
    return { error: "Nickname is required" };
  }

  const nicknameKey = makeNicknameKey(displayName);

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, status: true },
  });

  if (!league) {
    return { error: "Game PIN not found" };
  }

  const member = await prisma.leagueMember.findFirst({
    where: {
      leagueId: league.id,
      nicknameKey,
    },
    select: { id: true, reconnectCode: true, deviceToken: true },
  });

  if (!member) {
    return { error: "Invalid reconnect credentials" };
  }

  const reconnectMatches = reconnectCode && member.reconnectCode === reconnectCode;
  const deviceMatches = deviceToken && member.deviceToken === deviceToken;

  if (!reconnectMatches && !deviceMatches) {
    return { error: "Invalid reconnect credentials" };
  }

  const cookieStore = await cookies();
  cookieStore.set(`cl_member_${league.id}`, member.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(`/league/${league.id}/dashboard`);
}

/* ============================================================
   SET CHAMPIONSHIP PREDICTION
============================================================ */

type SetPredictionResult = { success: true } | { error: string };

export async function setChampionshipPrediction(
  leagueId: string,
  prediction: number | string,
): Promise<SetPredictionResult> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;

  if (!memberId) {
    return { error: "Not signed in to this league" };
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, status: true },
  });

  if (!league) {
    return { error: "League not found" };
  }

  const member = await prisma.leagueMember.findFirst({
    where: {
      id: memberId,
      leagueId,
    },
    select: { id: true },
  });

  if (!member) {
    return { error: "You are not a member of this league" };
  }

  const value = typeof prediction === "string" ? parseInt(prediction, 10) : prediction;
  if (!Number.isInteger(value) || value < 1 || value > 300) {
    return { error: "Prediction must be a whole number between 1 and 300" };
  }

  await prisma.leagueMember.update({
    where: { id: memberId },
    data: { championshipPrediction: value },
  });

  return { success: true };
}

/* ============================================================
   FORCE START (Host Override) — Chaos v2 hybrid lifecycle
   Host can force league to LIVE from SETUP or LOCKED.
   Primary path is automatic (lock when rosters complete, live at threshold).
============================================================ */

export async function startTournament(leagueId: string): Promise<{ error?: string } | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value;
  if (!memberId) return { error: "Not signed in to this league" };

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, status: true },
  });
  if (!league) return { error: "League not found" };
  if (league.status !== "SETUP" && league.status !== "LOCKED") {
    return { error: "Tournament already started or completed" };
  }

  const member = await prisma.leagueMember.findFirst({
    where: { id: memberId, leagueId },
    select: { isAdmin: true },
  });
  if (!member?.isAdmin) return { error: "Only the host can force start" };

  const memberCount = await prisma.leagueMember.count({ where: { leagueId } });
  const expectedPicks = memberCount * 6;
  const actualPicks = await prisma.portfolioPick.count({ where: { leagueId } });
  if (actualPicks < expectedPicks) {
    return { error: `All players must complete their roster (2/2/2) before starting. Current: ${actualPicks}/${expectedPicks} picks.` };
  }

  const membersWithoutTiebreaker = await prisma.leagueMember.count({
    where: { leagueId, championshipPrediction: null },
  });
  if (membersWithoutTiebreaker > 0) {
    return { error: `All players must submit a championship tiebreaker before starting. ${membersWithoutTiebreaker} player(s) still missing.` };
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { status: "LIVE" },
  });

  revalidatePath(`/league/${leagueId}/dashboard`);
  redirect(`/league/${leagueId}/dashboard`);
}

export async function startTournamentFromForm(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) return { error: "League not found" };
  return startTournament(leagueId);
}
