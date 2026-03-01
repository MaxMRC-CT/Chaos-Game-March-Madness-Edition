import BracketClient from "./_components/bracket-client";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";

async function getSummary(leagueId: string): Promise<WarRoomResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const response = await fetch(
    `${baseUrl}/api/war-room?leagueId=${encodeURIComponent(leagueId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json()) as WarRoomResponse;
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const summary = await getSummary(leagueId);

  if (!summary) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  return <BracketClient leagueId={leagueId} initial={summary} />;
}
