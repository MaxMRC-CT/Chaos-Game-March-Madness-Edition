import Link from "next/link";
import DashboardClient from "./_components/dashboard-client";
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
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const summary = await getSummary(leagueId);

  if (!summary) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  if (summary.league.status === "SETUP") {
    return (
      <main className="mx-auto min-h-dvh max-w-3xl space-y-4 p-6">
        <p className="text-sm text-neutral-700">This league is still in setup.</p>
        <Link href={`/league/${leagueId}/lobby`} className="underline">
          Go to Lobby
        </Link>
      </main>
    );
  }

  if (summary.league.status === "DRAFT") {
    return (
      <main className="mx-auto min-h-dvh max-w-3xl space-y-4 p-6">
        <p className="text-sm text-neutral-700">Draft is in progress.</p>
        <Link href={`/league/${leagueId}/draft`} className="underline">
          Go to Draft
        </Link>
      </main>
    );
  }

  return <DashboardClient leagueId={leagueId} initial={summary} />;
}
