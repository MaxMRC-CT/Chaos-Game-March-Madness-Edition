"use client";

import { Activity, Flame, LayoutGrid, Swords, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTeamOwnershipMap } from "@/lib/league/ownership";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { EventTimeline } from "@/app/league/[leagueId]/dashboard/_components/event-timeline";
import { LeaderboardPanel } from "@/app/league/[leagueId]/dashboard/_components/leaderboard-panel";
import { RivalriesView } from "@/app/league/[leagueId]/dashboard/_components/rivalries-view";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";

const TABS = ["standings", "power", "rivalries", "feed"] as const;
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
    TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "standings",
  );
  const [data, setData] = useState<WarRoomResponse | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/war-room?leagueId=${leagueId}&limit=30`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Failed to load");
      const payload = (await response.json()) as WarRoomResponse;
      setData(payload);
      setError(null);
    } catch {
      setError("Could not load league data");
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (TABS.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);

  const resultByTeamId = useMemo(() => {
    const map: Record<string, WarRoomResponse["teamResults"][number]> = {};
    if (!data) return map;
    for (const r of data.teamResults) map[r.teamId] = r;
    return map;
  }, [data?.teamResults]);

  const aliveRolesByMemberId = useMemo(() => {
    const map: Record<string, Array<"HERO" | "VILLAIN" | "CINDERELLA">> = {};
    if (!data) return map;
    for (const pick of data.picks) {
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
    return data.highlightEvents.filter((e) => e.type === "RIVALRY_BONUS").slice(0, 6);
  }, [data?.highlightEvents]);

  const ownershipMap = useMemo(() => {
    if (!data) return {};
    return buildTeamOwnershipMap(data.picks);
  }, [data?.picks]);

  const standings = data?.standings ?? [];
  const showDraft = data?.league.status === "DRAFT";

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
                  <span className="text-sm text-neutral-400">Standings, power, rivalries, feed</span>
                </div>
              </div>
              <div className="flex gap-2">
                {showDraft ? (
                  <Link
                    href={`/league/${leagueId}/draft`}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-300 underline-offset-4 transition hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  >
                    Draft
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
                t === "standings"
                  ? "Standings"
                  : t === "power"
                    ? "Power"
                    : t === "rivalries"
                      ? "Rivalries"
                      : "Feed";
              const Icon =
                t === "standings"
                  ? Flame
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

          {activeTab === "standings" ? (
            <section className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
              <div className="overflow-x-auto rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0f1623]">
                    <tr className="border-b border-[#1f2937]">
                      <th className="px-2 py-2 text-left text-neutral-400 sm:px-4 sm:py-3">Rank</th>
                      <th className="px-2 py-2 text-left text-neutral-400 sm:px-4 sm:py-3">Player</th>
                      <th className="px-2 py-2 text-right text-neutral-400 sm:px-4 sm:py-3">Total</th>
                      <th className="px-2 py-2 text-right text-neutral-400 sm:px-4 sm:py-3">Hero</th>
                      <th className="px-2 py-2 text-right text-neutral-400 sm:px-4 sm:py-3">Villain</th>
                      <th className="px-2 py-2 text-right text-neutral-400 sm:px-4 sm:py-3">Cinderella</th>
                      <th className="hidden px-2 py-2 text-right text-neutral-400 sm:table-cell sm:px-4 sm:py-3">
                        Rivalry
                      </th>
                      <th className="hidden px-2 py-2 text-right text-neutral-400 sm:table-cell sm:px-4 sm:py-3">
                        TB
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, index) => (
                      <tr
                        key={row.memberId}
                        className="border-t border-[#1f2937] transition-colors hover:bg-white/5"
                      >
                        <td className="px-2 py-2 sm:px-4 sm:py-3">
                          <span className="inline-flex rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] font-medium tabular-nums">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-neutral-100 sm:px-4 sm:py-3">{row.displayName}</td>
                        <td className="px-2 py-2 text-right font-semibold tabular-nums text-neutral-100 sm:px-4 sm:py-3">
                          {row.total ?? 0}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-neutral-300 sm:px-4 sm:py-3">
                          {row.HERO ?? 0}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-neutral-300 sm:px-4 sm:py-3">
                          {row.VILLAIN ?? 0}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-neutral-300 sm:px-4 sm:py-3">
                          {row.CINDERELLA ?? 0}
                        </td>
                        <td className="hidden px-2 py-2 text-right tabular-nums text-neutral-300 sm:table-cell sm:px-4 sm:py-3">
                          {row.rivalry ?? 0}
                        </td>
                        <td className="hidden px-2 py-2 text-right text-[10px] tabular-nums text-neutral-500 sm:table-cell sm:px-4 sm:py-3">
                          {row.championshipPrediction != null ? row.championshipPrediction : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : activeTab === "power" && data ? (
            <LeaderboardPanel
                standings={data.standings}
                me={data.me}
                aliveRolesByMemberId={aliveRolesByMemberId}
                standingsDelta={data.standingsDelta}
                highlightEvents={data.highlightEvents}
                ownershipMap={ownershipMap}
              />
          ) : activeTab === "rivalries" && data ? (
            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
              <RivalriesView data={data} rivalryMoments={rivalryMoments} />
            </section>
          ) : activeTab === "feed" && data ? (
            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
              <EventTimeline
                events={data.recentEvents}
                picks={data.picks}
                members={data.members}
                teams={data.teams}
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

