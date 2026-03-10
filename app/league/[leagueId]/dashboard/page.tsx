import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";
import {
  memberHasSubmittedPortfolio,
  allMembersSubmitted,
  canEditPortfolio,
  isPreTip,
} from "@/lib/league/member-status";
import DashboardClient from "./_components/dashboard-client";
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
  const hasSubmitted = memberHasSubmittedPortfolio(
    summary.myPicks?.length ?? 0,
    summary.me?.championshipPrediction ?? null,
  );

  const championshipByMemberId = new Map(
    (summary.standings ?? []).map((s) => [s.memberId, s.championshipPrediction]),
  );
  for (const m of summary.members ?? []) {
    if (!championshipByMemberId.has(m.id)) {
      championshipByMemberId.set(m.id, summary.me?.memberId === m.id ? summary.me?.championshipPrediction : null);
    }
  }
  const readyForTipOff = allMembersSubmitted(
    summary.members ?? [],
    summary.picks ?? [],
    championshipByMemberId,
  );

  // Non-submitted member → portfolio builder (redirect to portfolio)
  if (memberId && !hasSubmitted) {
    redirect(`/league/${leagueId}/portfolio`);
  }

  // Submitted member: show real War Room (with pre-tip banner if applicable)
  const preTip = isPreTip(summary.league.status);
  const canEdit = canEditPortfolio(summary.league.status);

  return (
    <DashboardClient
      leagueId={leagueId}
      initial={summary}
      preTipBanner={
        preTip
          ? {
              variant: readyForTipOff ? "ready" : "submitted",
              canEditPicks: canEdit,
              isAdmin: Boolean(summary.me?.isAdmin),
            }
          : undefined
      }
    />
  );
}
