import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";
import { WarRoomResponse } from "../dashboard/_components/types";
import MyLeagueClient from "./_components/my-league-client";

async function loadWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const data = await getWarRoomData(leagueId, {
    limit: 30,
    memberId,
  });
  return data as WarRoomResponse | null;
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const initial = await loadWarRoomData(leagueId);
  return <MyLeagueClient leagueId={leagueId} initial={initial} />;
}
