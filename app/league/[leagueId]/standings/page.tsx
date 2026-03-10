import { getAppBaseUrl } from "@/lib/utils/app-url";
import { WarRoomResponse } from "../dashboard/_components/types";
import MyLeagueClient from "./_components/my-league-client";

async function getWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const baseUrl = getAppBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/war-room?leagueId=${encodeURIComponent(leagueId)}&limit=30`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json()) as WarRoomResponse;
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const initial = await getWarRoomData(leagueId);
  return <MyLeagueClient leagueId={leagueId} initial={initial} />;
}
