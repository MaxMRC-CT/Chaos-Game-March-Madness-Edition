import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";
import DashboardClient from "./_components/dashboard-client";
import { PreDraftWarRoom } from "./_components/pre-draft-war-room";
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

  // Pre-live: SETUP, LOCKED, or DRAFT — show PreDraftWarRoom (picks editable only in SETUP)
  if (summary.league.status === "SETUP" || summary.league.status === "LOCKED" || summary.league.status === "DRAFT") {
    return <PreDraftWarRoom leagueId={leagueId} initial={summary} />;
  }

  // Post-draft: LIVE or COMPLETE — render existing War Room unchanged
  return <DashboardClient leagueId={leagueId} initial={summary} />;
}
