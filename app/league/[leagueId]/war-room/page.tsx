import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";
import MyLeagueClient from "../standings/_components/my-league-client";
import { WarRoomResponse } from "../dashboard/_components/types";

async function loadWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const data = await getWarRoomData(leagueId, { memberId });
  return data as WarRoomResponse | null;
}

export default async function WarRoomPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const summary = await loadWarRoomData(leagueId);

  if (!summary) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  const memberId = summary.me?.memberId ?? null;
  if (!memberId) {
    redirect(`/join?code=${encodeURIComponent(summary.league.code)}`);
  }

  return <MyLeagueClient leagueId={leagueId} initial={summary} />;
}
