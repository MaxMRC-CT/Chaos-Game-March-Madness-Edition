"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { LeaderboardPanel } from "./leaderboard-panel";
import { RoundSummaryCard } from "./RoundSummaryCard";
import { LiveFeed } from "./live-feed";
import { MyTeam } from "./my-team";
import { WarRoomResponse } from "./types";

const ROUND_LABELS: Record<WarRoomResponse["league"]["currentRound"], string> = {
  R64: "Round of 64",
  R32: "Round of 32",
  S16: "Sweet 16",
  E8: "Elite 8",
  F4: "Final Four",
  FINAL: "Championship",
  CHAMP: "Champion",
};

const panelClass =
  "rounded-xl border border-neutral-800 bg-neutral-900/95 shadow-lg";
const panelHover =
  "transition duration-200 motion-reduce:transition-none supports-[hover:hover]:hover:shadow-xl";
const innerCard = "rounded-xl border border-neutral-700/80 bg-neutral-800/60";
const innerCardHover =
  "transition duration-150 supports-[hover:hover]:hover:bg-neutral-800/80";
const innerPill = "rounded bg-neutral-900/60 px-2 py-0.5";
const headingKicker =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500";
const sectionTitle =
  "text-base font-semibold tracking-wide text-neutral-100 sm:text-lg";

export default function DashboardClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState<WarRoomResponse>(initial);
  const [copied, setCopied] = useState(false);
  const prevStandingsRef = useRef<WarRoomResponse["standings"] | null>(null);
  const [rankDelta, setRankDelta] = useState<Record<string, number>>({});

  const load = useCallback(
    async (limit = 15, mode: "all" | "highlights" = "all") => {
      const response = await fetch(
        `/api/war-room?leagueId=${leagueId}&limit=${limit}&mode=${mode}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) return;
      const payload = (await response.json()) as WarRoomResponse;
      const prev = prevStandingsRef.current;
      if (prev && prev.length > 0 && payload.standings.length > 0) {
        const prevRank = new Map(prev.map((r, i) => [r.memberId, i + 1]));
        const delta: Record<string, number> = {};
        payload.standings.forEach((r, i) => {
          const pr = prevRank.get(r.memberId) ?? payload.standings.length + 1;
          delta[r.memberId] = pr - (i + 1);
        });
        setRankDelta(delta);
      }
      prevStandingsRef.current = payload.standings;
      setData(payload);
    },
    [leagueId],
  );

  useEffect(() => {
    if (data.league.status !== "LIVE") return;
    const id = window.setInterval(() => void load(15, "all"), 5000);
    return () => window.clearInterval(id);
  }, [data.league.status, load]);

  const myStanding = data.me
    ? data.standings.find((row) => row.memberId === data.me?.memberId) ?? null
    : null;
  const myRank = data.me
    ? data.standings.findIndex((row) => row.memberId === data.me?.memberId) + 1
    : 0;

  const resultByTeamId = useMemo(() => {
    const map: Record<string, WarRoomResponse["teamResults"][number]> = {};
    for (const result of data.teamResults) {
      map[result.teamId] = result;
    }
    return map;
  }, [data.teamResults]);

  const aliveRolesByMemberId = useMemo(() => {
    const map: Record<string, Array<"HERO" | "VILLAIN" | "CINDERELLA">> = {};
    for (const pick of data.picks) {
      const result = resultByTeamId[pick.teamId];
      const isAlive = !result || result.eliminatedRound === null || result.eliminatedRound === "CHAMP";
      if (!isAlive) continue;
      if (!map[pick.memberId]) map[pick.memberId] = [];
      map[pick.memberId].push(pick.role);
    }
    return map;
  }, [data.picks, resultByTeamId]);

  const rivalryMoments = useMemo(
    () => data.highlightEvents.filter((event) => event.type === "RIVALRY_BONUS").slice(0, 6),
    [data.highlightEvents],
  );

  const nextTip = useMemo(() => {
    if (data.hotSeatMatchups.length === 0) return "No active game scheduled";
    return data.hotSeatMatchups[0].label;
  }, [data.hotSeatMatchups]);

  const initials = (data.me?.displayName || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const reconnectSaved = useMemo(() => {
    if (typeof window === "undefined") return Boolean(data.me);
    const reconnectKey = `chaos_${leagueId}_deviceToken`;
    return Boolean(window.localStorage.getItem(reconnectKey)) || Boolean(data.me);
  }, [data.me, leagueId]);

  async function copyPin() {
    try {
      await navigator.clipboard.writeText(data.league.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const cta = commandCta(data.league.status, leagueId, Boolean(data.me?.isAdmin));
  const statusStyle = getStatusStyle(data.league.status);
  const myDelta = data.me ? data.standingsDelta[data.me.memberId] || 0 : 0;
  const deltaClass = getDeltaClass(myDelta);

  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(data.me?.isAdmin)} />

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="min-w-0 space-y-4 lg:col-span-8">
              <header className={`${panelClass} ${panelHover} p-6 sm:p-6`}>
                <div className="grid gap-5">
                  {/* 1) League context */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={headingKicker}>
                        {ROUND_LABELS[data.league.currentRound]}
                      </p>
                      <p className="mt-1 text-sm font-medium text-neutral-200">
                        {data.league.name}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[11px] font-medium ${statusStyle.pill}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                      {formatLeagueStatus(data.league.status)}
                    </span>
                  </div>

                  {/* 2) Player identity */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-neutral-50 shadow-inner">
                      {initials || "G"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">
                        {data.me?.displayName || "Guest"}
                      </p>
                      <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span>{data.me?.isAdmin ? "League Manager" : "League Member"}</span>
                        {myRank ? (
                          <>
                            <span>•</span>
                            <span>Rank #{myRank}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* 3) Stats chips row */}
                  <div className="flex flex-wrap gap-2">
                    <InfoChip>
                      <span className="text-neutral-400">Points</span>
                      <span className="ml-2 font-semibold">
                        {myStanding?.total ?? 0}
                      </span>
                    </InfoChip>
                    <InfoChip>
                      <span className="text-neutral-400">Δ</span>
                      <span className={`ml-2 font-semibold ${deltaClass}`}>
                        {formatDelta(myDelta)}
                      </span>
                    </InfoChip>
                    <InfoChip className="max-w-full min-w-0">
                      <span className="text-neutral-400">Next tip</span>
                      <span className="ml-2 max-w-[190px] truncate text-xs font-medium text-neutral-100 sm:max-w-[260px]">
                        {nextTip}
                      </span>
                    </InfoChip>
                  </div>

                  {/* 4) PIN row + reconnect status */}
                  <div className="mt-2 border-t border-white/10 pt-4">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <InfoChip className="bg-neutral-900/60 border-white/15">
                          <span className="text-neutral-400">PIN</span>
                          <span className="ml-2 font-mono text-[12px]">
                            {data.league.code}
                          </span>
                        </InfoChip>
                        <button
                          type="button"
                          onClick={copyPin}
                          aria-label="Copy PIN"
                          className="inline-flex items-center rounded-full border border-white/10 bg-transparent px-3 py-1 text-xs text-neutral-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] active:scale-95"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {reconnectSaved ? (
                        <p className="text-xs font-medium text-emerald-400 sm:text-right">
                          Reconnect saved
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-amber-300 sm:text-right">
                          Reconnect not saved
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 5) Primary action: full-width View Full Bracket */}
                  <Link
                    href={`/league/${leagueId}/bracket`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-emerald-900/20 transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] active:scale-[0.99]"
                  >
                    View Full Bracket
                  </Link>

                  {/* 6) Secondary actions row */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    {cta.kind === "link" ? (
                      <Link
                        href={cta.href}
                        className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/15 bg-transparent px-3 text-xs font-medium text-neutral-100 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] sm:h-9 sm:text-sm"
                      >
                        {cta.label}
                      </Link>
                    ) : (
                      <a
                        href={cta.href}
                        className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/15 bg-transparent px-3 text-xs font-medium text-neutral-100 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] sm:h-9 sm:text-sm"
                      >
                        {cta.label}
                      </a>
                    )}
                    <Link
                      href={`/join?code=${encodeURIComponent(data.league.code)}`}
                      className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/15 bg-transparent px-3 text-xs font-medium text-neutral-100 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] sm:h-9 sm:text-sm"
                    >
                      Share
                    </Link>
                  </div>
                </div>
              </header>

              {data.roundSummary ? (
                <RoundSummaryCard roundSummary={data.roundSummary} />
              ) : null}

              <section id="hot-seat" className={`${panelClass} ${panelHover} p-4 sm:p-5`}>
                <h2 className={`mb-3 ${sectionTitle}`}>
                  Chaos Hot Seat
                </h2>
                {data.games.length === 0 ? (
                  <div className={`${innerCard} p-4 text-center sm:p-6`}>
                    <p className="text-sm text-neutral-400">Tournament hasn&apos;t started yet.</p>
                    <p className="mt-1 text-xs text-neutral-500">Results will appear here once games begin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.hotSeatMatchups.map((matchup) => (
                      <Link
                        key={matchup.id}
                        href={`/league/${leagueId}/bracket#region-${matchup.region.toLowerCase()}`}
                        className={`${innerCard} p-3 ${innerCardHover}`}
                      >
                        <p className="text-sm font-semibold text-neutral-100">{matchup.label}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {matchup.teamA.seed} vs {matchup.teamB.seed} • {matchup.region}
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-neutral-300">
                          <p>Hero owners: {joinOrDash(matchup.impact.heroOwners)}</p>
                          <p>Villain owners: {joinOrDash(matchup.impact.villainOwners)}</p>
                          <p>Cinderella owners: {joinOrDash(matchup.impact.cinderellaOwners)}</p>
                          {matchup.impact.teamAOwnership && matchup.impact.teamBOwnership ? (
                            <p className="pt-1 text-[10px] text-neutral-500">
                              Ownership: {matchup.teamA.shortName || matchup.teamA.name} H:{matchup.impact.teamAOwnership.heroPct}% V:{matchup.impact.teamAOwnership.villainPct}% C:{matchup.impact.teamAOwnership.cinderellaPct}% · {matchup.teamB.shortName || matchup.teamB.name} H:{matchup.impact.teamBOwnership.heroPct}% V:{matchup.impact.teamBOwnership.villainPct}% C:{matchup.impact.teamBOwnership.cinderellaPct}%
                            </p>
                          ) : null}
                        </div>
                        <div className={`mt-2 ${innerPill} text-xs text-neutral-200`}>
                          <p>{matchup.potentialSwing.ifTeamAWins}</p>
                          <p className="mt-1">{matchup.potentialSwing.ifTeamBWins}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-12">
                <div className="min-w-0 2xl:col-span-7">
                  <MyTeam myPicks={data.myPicks} standingsRow={myStanding} resultByTeamId={resultByTeamId} ownershipByRole={data.ownershipByRole} />
                </div>

                <section
                  id="rivalries"
                  className={`${panelClass} ${panelHover} min-w-0 2xl:col-span-5 p-4 sm:p-5`}
                >
                  <h2 className={`mb-3 ${sectionTitle}`}>
                    Rivalry Moments
                  </h2>
                  {data.rivalryPanel &&
                    (data.rivalryPanel.closestRival ||
                      data.rivalryPanel.directConflict ||
                      data.rivalryPanel.strategicCollision) ? (
                    <div className="mb-3 space-y-2 rounded-lg border border-violet-500/20 bg-violet-950/20 p-3">
                      {data.rivalryPanel.closestRival && (
                        <p className="text-xs text-violet-300">
                          <span className="font-medium">Closest rival:</span>{" "}
                          {data.rivalryPanel.closestRival.detail}
                        </p>
                      )}
                      {data.rivalryPanel.directConflict && (
                        <p className="text-xs text-violet-300">
                          <span className="font-medium">Direct conflict:</span>{" "}
                          {data.rivalryPanel.directConflict.detail}
                        </p>
                      )}
                      {data.rivalryPanel.strategicCollision && (
                        <p className="text-xs text-violet-300">
                          <span className="font-medium">Strategic collision:</span>{" "}
                          {data.rivalryPanel.strategicCollision.detail}
                        </p>
                      )}
                    </div>
                  ) : null}
                  {rivalryMoments.length === 0 ? (
                    <p className="text-sm text-neutral-400">No rivalry swings yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rivalryMoments.map((event) => (
                        <li
                          key={event.id}
                          className={`${innerCard} ${innerCardHover} min-w-0 px-3 py-2 text-sm`}
                        >
                          <p className="min-w-0 break-words text-neutral-100 sm:truncate">
                            {formatRivalryMoment(event, data)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-4">
              <div className="min-w-0 space-y-4 lg:sticky lg:top-4">
                <p className={headingKicker}>
                  War Room Intel
                </p>
                <div className="space-y-4">
                  <div className="min-w-0">
                    <LeaderboardPanel
                      standings={data.standings}
                      me={data.me}
                      aliveRolesByMemberId={aliveRolesByMemberId}
                      standingsDelta={data.standingsDelta}
                      highlightEvents={data.highlightEvents}
                      ownershipMap={data.ownershipMap}
                      momentumSummaries={data.momentumSummaries}
                      rankDelta={rankDelta}
                      contrarianLabels={data.contrarianLabels}
                    />
                  </div>

                  <section id="feed">
                    <LiveFeed
                      allEvents={data.recentEvents}
                      highlightEvents={data.highlightEvents}
                      picks={data.picks}
                      members={data.members}
                      teams={data.teams}
                      ownershipByRole={data.ownershipByRole}
                      limit={10}
                      compact
                      maxHeightClass="max-h-[260px]"
                      showFilters={false}
                      title="Recent Activity"
                      subtitle="Last 10 events"
                      linkToFeed
                      linkToFeedHref={`/league/${leagueId}/standings?tab=feed`}
                    />
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

function formatLeagueStatus(status: WarRoomResponse["league"]["status"]) {
  if (status === "LIVE") return "Live";
  if (status === "COMPLETE") return "Final";
  if (status === "SETUP") return "Lobby";
  if (status === "LOCKED") return "Locked";
  if (status === "DRAFT") return "Draft";
  return status;
}

function getStatusStyle(status: WarRoomResponse["league"]["status"]) {
  if (status === "LIVE") {
    return {
      pill: "bg-emerald-500/15 text-emerald-300",
      dot: "bg-emerald-400 animate-pulse",
    };
  }
  if (status === "COMPLETE") {
    return {
      pill: "bg-neutral-500/15 text-neutral-200",
      dot: "bg-neutral-300",
    };
  }
  // SETUP / DRAFT / other pre-live states
  return {
    pill: "bg-amber-500/15 text-amber-200",
    dot: "bg-amber-300",
  };
}

function getDeltaClass(delta: number) {
  if (delta > 0) return "text-emerald-300";
  if (delta < 0) return "text-red-300";
  return "text-neutral-200";
}

function InfoChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs ${
        className || ""
      }`}
    >
      {children}
    </span>
  );
}

const MotionLink = motion(Link);

function commandCta(
  status: WarRoomResponse["league"]["status"],
  leagueId: string,
  isAdmin: boolean,
) {
  if (status === "SETUP" || status === "DRAFT") {
    return { kind: "link" as const, href: `/league/${leagueId}/portfolio`, label: "Build roster" };
  }
  if (status === "LOCKED") {
    return { kind: "anchor" as const, href: "#activity", label: "View activity" };
  }
  if (status === "LIVE") {
    return { kind: "anchor" as const, href: "#hot-seat", label: "View Tonight's Chaos" };
  }
  return { kind: "anchor" as const, href: "#power-rankings", label: "Crown the Champion" };
}

function formatDelta(delta: number) {
  if (!delta) return "±0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function joinOrDash(values: string[]) {
  return values.length > 0 ? values.join(", ") : "—";
}

function formatRivalryMoment(event: WarRoomResponse["highlightEvents"][number], data: WarRoomResponse) {
  const payload = (event.payload || {}) as Record<string, unknown>;
  const winnerTeamId = String(payload.winnerTeamId || "");
  const loserTeamId = String(payload.loserTeamId || "");
  const delta = Number(payload.delta || 0);
  const winnerTeam = data.teams.find((team) => team.id === winnerTeamId);
  const loserTeam = data.teams.find((team) => team.id === loserTeamId);
  const member = data.members.find((m) => m.id === String(payload.memberId || ""));

  return `${member?.displayName || "Unknown"} ${delta >= 0 ? "+" : ""}${delta} • ${winnerTeam?.shortName || winnerTeam?.name || "Team"} over ${loserTeam?.shortName || loserTeam?.name || "Team"}`;
}
