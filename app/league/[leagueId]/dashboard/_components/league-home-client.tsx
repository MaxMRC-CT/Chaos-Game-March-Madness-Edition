"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { RankMovementIndicator } from "@/app/league/[leagueId]/_components/rank-movement-indicator";
import { ScoreDeltaBadge } from "@/app/league/[leagueId]/_components/score-delta-badge";
import { HowToPlayLinks } from "@/components/how-to-play-links";
import { getSavedLeagues, upsertSavedLeague } from "@/lib/client/device-session";
import {
  normalizeWarRoomPayload,
  isWarRoomErrorPayload,
} from "@/lib/war-room/normalize";
import { WarRoomResponse } from "./types";

const panelClass =
  "rounded-2xl border border-white/10 bg-neutral-900/95 p-3.5 shadow-lg shadow-black/20 sm:p-4";

export function LeagueHomeClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState(() => normalizeWarRoomPayload(initial));
  const [hasMultipleSavedLeagues, setHasMultipleSavedLeagues] = useState(false);
  const prevStandingsRef = useRef<WarRoomResponse["standings"] | null>(null);
  const [rankDelta, setRankDelta] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const response = await fetch(`/api/war-room?leagueId=${leagueId}&limit=12`, {
      cache: "no-store",
    });
    const raw = await response.json();
    if (!response.ok || isWarRoomErrorPayload(raw)) return;
    const payload = normalizeWarRoomPayload(raw);
    const prev = prevStandingsRef.current;

    if (prev && prev.length > 0 && payload.standings.length > 0) {
      const previousRanks = new Map(prev.map((row, index) => [row.memberId, index + 1]));
      const nextRankDelta: Record<string, number> = {};

      payload.standings.forEach((row, index) => {
        const previousRank = previousRanks.get(row.memberId) ?? payload.standings.length + 1;
        nextRankDelta[row.memberId] = previousRank - (index + 1);
      });

      setRankDelta(nextRankDelta);
    }

    prevStandingsRef.current = payload.standings;
    setData(payload);
  }, [leagueId]);

  useEffect(() => {
    const refresh = () => void load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
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
    if (!data.me) return;

    upsertSavedLeague({
      leagueId,
      leagueName: data.league.name,
      leagueCode: data.league.code,
      playerId: data.me.memberId,
      nickname: data.me.displayName,
    });
    const frame = window.requestAnimationFrame(() => {
      setHasMultipleSavedLeagues(getSavedLeagues().length > 1);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [data.league.code, data.league.name, data.me, leagueId]);

  const me = data.me;
  const myStanding = me
    ? data.standings.find((row) => row.memberId === me.memberId) ?? null
    : null;
  const myRank = me
    ? data.standings.findIndex((row) => row.memberId === me.memberId) + 1
    : 0;
  const myDelta = me ? data.standingsDelta[me.memberId] ?? 0 : 0;
  const topFive = data.standings.slice(0, 5);
  const resultByTeamId = useMemo(() => {
    const map: Record<string, WarRoomResponse["teamResults"][number] | undefined> = {};
    for (const result of data.teamResults) {
      map[result.teamId] = result;
    }
    return map;
  }, [data.teamResults]);

  const myTeamSnapshot = useMemo(() => {
    const counts = {
      HERO: { alive: 0, total: 0 },
      VILLAIN: { alive: 0, total: 0 },
      CINDERELLA: { alive: 0, total: 0 },
    };

    for (const pick of data.myPicks) {
      counts[pick.role].total += 1;
      const result = resultByTeamId[pick.teamId];
      const alive = !result || result.eliminatedRound === null || result.eliminatedRound === "CHAMP";
      if (alive) counts[pick.role].alive += 1;
    }

    return counts;
  }, [data.myPicks, resultByTeamId]);

  const latestGame = data.games.at(-1) ?? null;
  const latestEvent = data.highlightEvents[0] ?? data.recentEvents[0] ?? null;
  const latestChaos = useMemo(() => {
    if (latestGame) {
      const winner = latestGame.winner;
      const loser = latestGame.loser;
      const upset =
        winner && loser ? winner.seed > loser.seed : false;
      const myImpact = data.myPicks.some(
        (pick) => pick.teamId === latestGame.winnerTeamId || pick.teamId === latestGame.loserTeamId,
      );

      return {
        title: winner && loser ? `${winner.name} beat ${loser.name}` : "Latest result in",
        detail: `${formatRound(latestGame.round)} • ${upset ? "Upset" : "Result"}${myImpact ? " • impacted your board" : ""}`,
        badge: upset ? "Upset" : "Result",
        tone: upset ? "bg-violet-500/15 text-violet-200" : "bg-neutral-800 text-neutral-200",
      };
    }

    if (latestEvent) {
      return {
        title: formatEventTitle(latestEvent.type),
        detail: "Latest league movement",
        badge: "Chaos",
        tone: "bg-[#fb6223]/15 text-[#ffb08d]",
      };
    }

    return {
      title: "Tournament is almost here",
      detail: "Results will appear here as games finish.",
      badge: "Waiting",
      tone: "bg-neutral-800 text-neutral-300",
    };
  }, [data.myPicks, latestEvent, latestGame]);

  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(data.me?.isAdmin)} />

        <div className="min-w-0 flex-1 space-y-4">
          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  League Home
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  {data.league.name}
                </h1>
                <p className="mt-2 text-sm text-neutral-300">
                  You: {ordinal(myRank || 0)} place • {myStanding?.total ?? 0} pts •{" "}
                  <ScoreDeltaBadge delta={myDelta} todayLabel compact />
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{formatRound(data.league.currentRound)}</Badge>
                <Badge>{data.games.length} games completed</Badge>
                <Badge>PIN {data.league.code}</Badge>
                {hasMultipleSavedLeagues ? (
                  <Link
                    href="/my-leagues"
                    className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-200 transition hover:bg-neutral-700"
                  >
                    Switch League
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className={`${panelClass} space-y-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Leaderboard Snapshot
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Top of the League</h2>
                </div>
                <Link
                  href={`/league/${leagueId}/standings`}
                  className="text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  View Full Standings
                </Link>
              </div>

              <div className="space-y-2">
                {topFive.map((row, index) => {
                  const isMe = row.memberId === me?.memberId;
                  const delta = data.standingsDelta[row.memberId] ?? 0;
                  const movement = rankDelta[row.memberId] ?? 0;
                  return (
                    <div
                      key={row.memberId}
                      className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                        isMe
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          #{index + 1} {isMe ? "YOU" : row.displayName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                          <RankMovementIndicator delta={movement} compact />
                          <ScoreDeltaBadge delta={delta} todayLabel compact />
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-white">{row.total}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${panelClass} space-y-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    My Team Snapshot
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Your Board</h2>
                </div>
                <Link
                  href={`/league/${leagueId}/portfolio`}
                  className="text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  View My Team
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <SnapshotTile
                  label="Heroes"
                  value={`${myTeamSnapshot.HERO.alive}/${myTeamSnapshot.HERO.total}`}
                  accent="text-blue-300"
                />
                <SnapshotTile
                  label="Villains"
                  value={`${myTeamSnapshot.VILLAIN.alive}/${myTeamSnapshot.VILLAIN.total}`}
                  accent="text-red-300"
                />
                <SnapshotTile
                  label="Cinderellas"
                  value={`${myTeamSnapshot.CINDERELLA.alive}/${myTeamSnapshot.CINDERELLA.total}`}
                  accent="text-violet-300"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Alive counts shown first for quick scanning.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className={`${panelClass} space-y-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Latest Chaos
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">What Just Happened</h2>
                </div>
                <Link
                  href={`/league/${leagueId}/games`}
                  className="text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  View Games
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${latestChaos.tone}`}>
                    {latestChaos.badge}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{latestChaos.title}</p>
                <p className="mt-1 text-[13px] text-neutral-400">{latestChaos.detail}</p>
              </div>
            </div>

            <div className={`${panelClass} space-y-3`}>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Tournament Progress
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Where We Are</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SnapshotTile label="Current Round" value={formatRound(data.league.currentRound)} accent="text-white" />
                <SnapshotTile label="Games Done" value={String(data.games.length)} accent="text-white" />
                <SnapshotTile
                  label="Next Game"
                  value={data.hotSeatMatchups[0]?.label ?? "TBD"}
                  accent="text-neutral-200"
                  compact
                />
                <SnapshotTile
                  label="Status"
                  value={data.league.status}
                  accent={data.league.status === "LIVE" ? "text-emerald-300" : "text-amber-300"}
                />
              </div>
            </div>
          </section>

          <HowToPlayLinks
            variant="compact"
            title="Need a refresher?"
            description="Quick rules and app map."
          />

          <section className={`${panelClass} lg:hidden`}>
            <Link
              href={`/league/${leagueId}/more`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-neutral-200"
            >
              More options
              <ArrowRight className="size-4" />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

function SnapshotTile({
  label,
  value,
  accent,
  compact = false,
}: {
  label: string;
  value: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className={`mt-2 font-semibold ${compact ? "text-sm" : "text-xl"} ${accent}`}>{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-200">
      {children}
    </span>
  );
}

function ordinal(value: number) {
  if (!value) return "—";
  const remainder10 = value % 10;
  const remainder100 = value % 100;
  if (remainder10 === 1 && remainder100 !== 11) return `${value}st`;
  if (remainder10 === 2 && remainder100 !== 12) return `${value}nd`;
  if (remainder10 === 3 && remainder100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function formatRound(round: WarRoomResponse["league"]["currentRound"]) {
  if (round === "R64") return "Round of 64";
  if (round === "R32") return "Round of 32";
  if (round === "S16") return "Sweet 16";
  if (round === "E8") return "Elite 8";
  if (round === "F4") return "Final Four";
  if (round === "FINAL") return "Championship";
  return "Champion";
}

function formatEventTitle(type: string) {
  if (type === "TEAM_ELIMINATED") return "A tournament team was knocked out";
  if (type === "RIVALRY_BONUS") return "Rivalry bonus hit the board";
  if (type === "SCORE_RECALCULATED") return "Scores were recalculated";
  return "Latest league update";
}
