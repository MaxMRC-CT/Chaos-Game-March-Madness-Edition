
import BracketClient from "./_components/bracket-client";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";
import { prisma } from "@/lib/db";

async function getSummary(leagueId: string): Promise<WarRoomResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const response = await fetch(
    `${baseUrl}/api/war-room?leagueId=${encodeURIComponent(leagueId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json()) as WarRoomResponse;
}

type RoundCounts = { R64: number; R32: number; S16: number; E8: number; F4: number; NCG: number };

async function getRoundCounts(leagueId: string): Promise<RoundCounts | null> {
  if (process.env.ENV_NAME !== "development") return null;

  const games = await prisma.tournamentGame.findMany({
    where: { leagueId },
    select: { round: true },
  });

  const counts: RoundCounts = { R64: 0, R32: 0, S16: 0, E8: 0, F4: 0, NCG: 0 };
  for (const g of games) {
    const key = g.round === "FINAL" ? "NCG" : g.round;
    if (key in counts) counts[key as keyof RoundCounts]++;
  }
  return counts;
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const [summary, roundCounts] = await Promise.all([
    getSummary(leagueId),
    getRoundCounts(leagueId),
  ]);

  if (!summary) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  return (
    <BracketClient
      leagueId={leagueId}
      initial={summary}
      roundCounts={roundCounts}
    />
  );
}
