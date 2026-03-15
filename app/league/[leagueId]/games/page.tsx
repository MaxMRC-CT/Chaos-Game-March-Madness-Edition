import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWarRoomData } from "@/lib/war-room/get-data";
import { WarRoomResponse } from "../dashboard/_components/types";
import GamesClient from "./_components/games-client";

async function loadWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const data = await getWarRoomData(leagueId, { memberId, limit: 20 });
  return data as WarRoomResponse | null;
}

export default async function GamesPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const initial = await loadWarRoomData(leagueId);

  if (!initial) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  if (!initial.me) {
    redirect(`/join?code=${encodeURIComponent(initial.league.code)}`);
  }

  return <GamesClient leagueId={leagueId} initial={initial} />;
}
