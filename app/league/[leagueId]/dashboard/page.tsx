import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";
import { LeagueHomeClient } from "./_components/league-home-client";
import { WarRoomResponse } from "./_components/types";

async function loadWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const data = await getWarRoomData(leagueId, { memberId });
  return data as WarRoomResponse | null;
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { leagueId } = await params;
  const { view } = await searchParams;
  if (view === "rivalries") redirect(`/league/${leagueId}/standings?tab=rivalries`);
  if (view === "feed") redirect(`/league/${leagueId}/standings?tab=feed`);
  const summary = await loadWarRoomData(leagueId);

  if (!summary) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  const memberId = summary.me?.memberId ?? null;
  if (!memberId) {
    redirect(`/join?code=${encodeURIComponent(summary.league.code)}`);
  }

  return <LeagueHomeClient leagueId={leagueId} initial={summary} />;
}
