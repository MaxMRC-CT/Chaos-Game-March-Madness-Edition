import { prisma } from "@/lib/db";
import { makeNicknameKey, normalizeDisplayName } from "@/lib/league/nickname";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = String(searchParams.get("code") || "").trim();
  const nickname = String(searchParams.get("nickname") || "");

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: true, available: false, reason: "Enter Game PIN" });
  }

  const displayName = normalizeDisplayName(nickname);
  if (!displayName) {
    return NextResponse.json({ ok: true, available: false, reason: "Enter Nickname" });
  }

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ ok: true, available: false, reason: "Game PIN not found" });
  }

  const nicknameKey = makeNicknameKey(displayName);

  const existing = await prisma.leagueMember.findFirst({
    where: {
      leagueId: league.id,
      nicknameKey,
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    available: !existing,
  });
}
