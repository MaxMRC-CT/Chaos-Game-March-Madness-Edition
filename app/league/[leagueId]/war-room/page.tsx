import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";
import {
  memberHasSubmittedPortfolio,
  allMembersSubmitted,
  canEditPortfolio,
  isPreTip,
} from "@/lib/league/member-status";
import DashboardClient from "../dashboard/_components/dashboard-client";
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

  const hasSubmitted = memberHasSubmittedPortfolio(
    summary.myPicks?.length ?? 0,
    summary.me?.championshipPrediction ?? null,
  );

  const championshipByMemberId = new Map(
    (summary.standings ?? []).map((s) => [s.memberId, s.championshipPrediction]),
  );
  for (const m of summary.members ?? []) {
    if (!championshipByMemberId.has(m.id)) {
      championshipByMemberId.set(
        m.id,
        summary.me?.memberId === m.id ? summary.me?.championshipPrediction : null,
      );
    }
  }
  const readyForTipOff = allMembersSubmitted(
    summary.members ?? [],
    summary.picks ?? [],
    championshipByMemberId,
  );

  const preTip = isPreTip(summary.league.status);
  const canEdit = canEditPortfolio(summary.league.status);

  return (
    <DashboardClient
      leagueId={leagueId}
      initial={summary}
      hasSubmittedPortfolio={hasSubmitted}
      canEditPortfolio={canEdit}
      preTipBanner={
        preTip && hasSubmitted
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
