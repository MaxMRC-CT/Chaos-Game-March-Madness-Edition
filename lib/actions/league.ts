"use server";

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
    if (!existing) {
      return reconnectCode;
    }
  }

  throw new Error("Failed to generate reconnect code");
}

export async function createLeague(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("League name is required");

  const year = await prisma.tournamentYear.findUnique({
    where: { year: 2026 },
  });
  if (!year) throw new Error("TournamentYear 2026 not found. Run seed.");

  const code = await generateLeagueCode();

  const league = await prisma.league.create({
    data: {
      name,
      code,
      status: "SETUP",
      tournamentYearId: year.id,
    },
  });

  const displayName = "Host";
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

  redirect(`/league/${league.id}/lobby`);
}

export async function joinLeague(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  const code = String(formData.get("code") || "").trim();
  const rawNickname = String(formData.get("nickname") || "");

  if (!/^\d{6}$/.test(code)) return { error: "Enter a valid 6-digit Game PIN" };

  const displayName = normalizeDisplayName(rawNickname);
  if (!displayName) return { error: "Nickname is required" };

  const nicknameKey = makeNicknameKey(displayName);

  const league = await prisma.league.findUnique({ where: { code } });
  if (!league) return { error: "Game PIN not found" };

  try {
    const existing = await prisma.leagueMember.findFirst({
      where: {
        leagueId: league.id,
        nicknameKey,
      },
      select: { id: true },
    });

    if (existing) return { error: "That nickname is already taken in this league." };

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

  if (league.status === "DRAFT") {
    redirect(`/league/${league.id}/draft`);
  }

  if (league.status === "LIVE" || league.status === "COMPLETE") {
    redirect(`/league/${league.id}/dashboard`);
  }

  redirect(`/league/${league.id}/lobby`);
}
