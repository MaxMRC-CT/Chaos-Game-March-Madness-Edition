import { redirect } from "next/navigation";
import DashboardClient from "./_components/dashboard-client";
import { PreDraftWarRoom } from "./_components/pre-draft-war-room";
import { WarRoomResponse } from "./_components/types";

async function getSummary(leagueId: string): Promise<WarRoomResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const response = await fetch(
    `${baseUrl}/api/war-room?leagueId=${encodeURIComponent(leagueId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json()) as WarRoomResponse;
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
  const summary = await getSummary(leagueId);

  if (!summary) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  // Pre-draft: SETUP (waiting for host) or DRAFT (draft in progress) — show PreDraftWarRoom
  if (summary.league.status === "SETUP" || summary.league.status === "DRAFT") {
    return <PreDraftWarRoom leagueId={leagueId} initial={summary} />;
  }

  // Post-draft: LIVE or COMPLETE — render existing War Room unchanged
  return <DashboardClient leagueId={leagueId} initial={summary} />;
}
