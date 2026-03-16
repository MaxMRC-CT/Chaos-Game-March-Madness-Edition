"use client";

import { Activity, BarChart3, Swords, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTeamOwnershipMap } from "@/lib/league/ownership";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { EventTimeline } from "@/app/league/[leagueId]/dashboard/_components/event-timeline";
import { LeaderboardPanel } from "@/app/league/[leagueId]/dashboard/_components/leaderboard-panel";
import { RoundSummaryCard } from "@/app/league/[leagueId]/dashboard/_components/RoundSummaryCard";
import { RivalriesView } from "@/app/league/[leagueId]/dashboard/_components/rivalries-view";
import { MyLeaguePortfolioPanel } from "./my-league-portfolio-panel";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";
import {
  normalizeWarRoomPayload,
  isWarRoomErrorPayload,
} from "@/lib/war-room/normalize";

const TABS = ["portfolio", "power", "rivalries", "feed"] as const;
type Tab = (typeof TABS)[number];

export default function MyLeagueClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "portfolio",
  );
  const [data, setData] = useState<WarRoomResponse | null>(() =>
    initial ? normalizeWarRoomPayload(initial) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const prevStandingsRef = useRef<WarRoomResponse["standings"] | null>(null);
  const [rankDelta, setRankDelta] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/war-room?leagueId=${leagueId}&limit=30`,
        { cache: "no-store" },
      );
      const raw = await response.json();
      if (!response.ok) throw new Error("Failed to load");
      if (isWarRoomErrorPayload(raw)) throw new Error(raw.error);
      const payload = normalizeWarRoomPayload(raw);
      const prev = prevStandingsRef.current;
      const standings = payload.standings;
      if (prev && prev.length > 0 && standings.length > 0) {
        const prevRank = new Map(prev.map((r, i) => [r.memberId, i + 1]));
        const delta: Record<string, number> = {};
        standings.forEach((r, i) => {
          const pr = prevRank.get(r.memberId) ?? standings.length + 1;
          delta[r.memberId] = pr - (i + 1);
        });
        setRankDelta(delta);
      }
      prevStandingsRef.current = standings;
      setData(payload);
      setError(null);
    } catch {
      setError("Could not load league data");
    }
  }, [leagueId]);

  useEffect(() => {
    const refresh = () => void load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    refresh();
    const id = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  useEffect(() => {
    if (TABS.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);

  const resultByTeamId = useMemo(() => {
    const map: Record<string, WarRoomResponse["teamResults"][number]> = {};
    if (!data) return map;
    const teamResults = data.teamResults ?? [];
    for (const r of teamResults) map[r.teamId] = r;
    return map;
  }, [data?.teamResults]);

  const aliveRolesByMemberId = useMemo(() => {
    const map: Record<string, Array<"HERO" | "VILLAIN" | "CINDERELLA">> = {};
    if (!data) return map;
    const picks = data.picks ?? [];
    for (const pick of picks) {
      const result = resultByTeamId[pick.teamId];
      const isAlive =
        !result || result.eliminatedRound === null || result.eliminatedRound === "CHAMP";
      if (!isAlive) continue;
      if (!map[pick.memberId]) map[pick.memberId] = [];
      map[pick.memberId].push(pick.role);
    }
    return map;
  }, [data?.picks, resultByTeamId]);

  const rivalryMoments = useMemo(() => {
    if (!data) return [];
    const events = data.highlightEvents ?? [];
    return events.filter((e) => e.type === "RIVALRY_BONUS").slice(0, 6);
  }, [data?.highlightEvents]);

  const ownershipMap = useMemo(() => {
    if (!data) return {};
    return buildTeamOwnershipMap(data.picks ?? []);
  }, [data?.picks]);

  const showPortfolio = data?.league.status === "SETUP" || data?.league.status === "LOCKED" || data?.league.status === "DRAFT";

  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(data?.me?.isAdmin)} />

        <div className="min-w-0 flex-1 space-y-4">
          <header className="rounded-xl border border-neutral-800 bg-neutral-900/95 px-4 py-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl">My League</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                    {data?.league.status ?? "—"}
                  </span>
                  <span className="text-sm text-neutral-400">Portfolio, power, rivalries, and live league intel</span>
                  {data?.rivalryPanel &&
                    (data.rivalryPanel.closestRival ||
                      data.rivalryPanel.directConflict ||
                      data.rivalryPanel.strategicCollision) && (
                      <Link
                        href={`${pathname}?tab=rivalries`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20"
                      >
                        <Swords className="size-3" />
                        {data.rivalryPanel.closestRival
                          ? `Closest rival: ${data.rivalryPanel.closestRival.displayName}`
                          : data.rivalryPanel.directConflict
                            ? `Direct conflict: ${data.rivalryPanel.directConflict.displayName}`
                            : data.rivalryPanel.strategicCollision
                              ? `Strategic collision: ${data.rivalryPanel.strategicCollision.displayName}`
                              : "Rivalry intel"}
                      </Link>
                    )}
                </div>
              </div>
              <div className="flex gap-2">
                {showPortfolio ? (
                  <Link
                    href={`/league/${leagueId}/portfolio`}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 underline-offset-4 transition hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  >
                    Roster
                  </Link>
                ) : null}
                <Link
                  href={`/league/${leagueId}/lobby`}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 underline-offset-4 transition hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                >
                  Lobby
                </Link>
              </div>
            </div>
          </header>

          <div className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 p-1.5" role="tablist" aria-label="My League tabs">
            {TABS.map((t) => {
              const label =
                t === "portfolio"
                  ? "Portfolio"
                  : t === "power"
                    ? "Power"
                    : t === "rivalries"
                      ? "Rivalries"
                      : "Feed";
              const Icon =
                t === "portfolio"
                  ? BarChart3
                  : t === "power"
                    ? Zap
                    : t === "rivalries"
                      ? Swords
                      : Activity;
              const isActive = activeTab === t;
              return (
                <Link
                  key={t}
                  href={`${pathname}?tab=${t}`}
                  role="tab"
                  aria-selected={isActive}
                  className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium capitalize outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                    isActive
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          {data?.roundSummary && data.league.status === "LIVE" ? (
            <div className="mb-4">
              <RoundSummaryCard roundSummary={data.roundSummary} />
            </div>
          ) : null}

          {activeTab === "portfolio" && data?.myLeagueAnalytics ? (
            <MyLeaguePortfolioPanel
              data={{ ...data, myLeagueAnalytics: data.myLeagueAnalytics }}
            />
          ) : activeTab === "portfolio" && data ? (
            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6 text-center">
              <p className="text-sm text-neutral-400">
                Build your roster to see strategic portfolio analytics.
              </p>
              <Link
                href={`/league/${leagueId}/portfolio`}
                className="mt-3 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
              >
                Go to Roster →
              </Link>
            </section>
          ) : activeTab === "power" && data ? (
              <LeaderboardPanel
                standings={data.standings}
                me={data.me}
                aliveRolesByMemberId={aliveRolesByMemberId}
                standingsDelta={data.standingsDelta}
                highlightEvents={data.highlightEvents}
                ownershipMap={ownershipMap}
                momentumSummaries={data.momentumSummaries}
                rankDelta={rankDelta}
                contrarianLabels={data.contrarianLabels}
              />
          ) : activeTab === "rivalries" && data ? (
            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
              <RivalriesView data={data} rivalryMoments={rivalryMoments} />
            </section>
          ) : activeTab === "feed" && data ? (
            <section className="space-y-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
              {data.momentumSummaries &&
                (data.momentumSummaries.biggestJump ||
                  data.momentumSummaries.chaosSpike ||
                  data.momentumSummaries.leaderUnderPressure) && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 p-3">
                    {data.momentumSummaries.chaosSpike ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300">
                        Chaos Spike: {data.momentumSummaries.chaosSpike.label}
                      </span>
                    ) : data.momentumSummaries.biggestJump ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300">
                        Biggest Jump: {data.momentumSummaries.biggestJump.displayName || "Unknown"} +{data.momentumSummaries.biggestJump.spots} spots
                      </span>
                    ) : null}
                    {data.momentumSummaries.leaderUnderPressure ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-300">
                        Leader Under Pressure
                      </span>
                    ) : null}
                  </div>
                )}
              <EventTimeline
                events={data.recentEvents}
                picks={data.picks}
                members={data.members}
                teams={data.teams}
                ownershipByRole={data.ownershipByRole}
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
