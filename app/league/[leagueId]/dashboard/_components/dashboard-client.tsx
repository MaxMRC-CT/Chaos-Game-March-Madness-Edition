"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLockup } from "@/app/(dashboard)/_components/BrandLockup";
import { LeaderboardPanel } from "./leaderboard-panel";
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

export default function DashboardClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState<WarRoomResponse>(initial);
  const [copied, setCopied] = useState(false);
  const [expandedFeed, setExpandedFeed] = useState(false);

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
      setData(payload);
    },
    [leagueId],
  );

  useEffect(() => {
    if (data.league.status !== "LIVE") return;
    const id = window.setInterval(() => void load(expandedFeed ? 30 : 15, "all"), 5000);
    return () => window.clearInterval(id);
  }, [data.league.status, expandedFeed, load]);

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

  return (
    <main className="min-h-dvh text-neutral-100">
      <div className="mx-auto flex max-w-[1600px] gap-4 p-4">
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[240px] shrink-0 rounded-xl border border-[#1f2937] bg-[#111827] p-4 lg:block">
          <BrandLockup />
          <nav className="mt-4 space-y-1 text-sm">
            <NavItem href={`/league/${leagueId}/dashboard`} active>
              🏟 War Room
            </NavItem>
            <NavItem href={`/league/${leagueId}/bracket`}>🧩 Full Bracket</NavItem>
            <NavItem href={`/league/${leagueId}/standings`}>🏆 Power Rankings</NavItem>
            <NavItem href={`/league/${leagueId}/dashboard#rivalries`}>⚔ Rivalries</NavItem>
            <NavItem href={`/league/${leagueId}/dashboard#feed`}>📡 Live Feed</NavItem>
            {data.me?.isAdmin ? <NavItem href={`/league/${leagueId}/admin/results`}>⚙ Admin</NavItem> : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <header className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{data.league.name}</h1>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    {data.league.status}
                  </span>
                  <span className="text-neutral-300">{ROUND_LABELS[data.league.currentRound]}</span>
                </div>
                <p className="mt-2 text-xs text-neutral-400">Tip-off in 2d 4h</p>
                <p className="mt-1 text-sm text-neutral-300">Next Tip: {nextTip}</p>
                <div className="mt-3">
                  {cta.kind === "link" ? (
                    <Link href={cta.href} className="rounded-md border border-[#1f2937] bg-[#0f1623] px-3 py-1.5 text-xs">
                      {cta.label}
                    </Link>
                  ) : (
                    <a href={cta.href} className="rounded-md border border-[#1f2937] bg-[#0f1623] px-3 py-1.5 text-xs">
                      {cta.label}
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#1f2937] bg-[#0f1623] p-3 text-sm text-neutral-300">
                <p className="text-xs uppercase tracking-wide text-neutral-400">View</p>
                <Link href={`/league/${leagueId}/bracket`} className="mt-1 inline-block underline">
                  View Full Bracket
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 font-semibold">
                  {initials}
                </span>
                <div className="text-right text-xs text-neutral-300">
                  <p>{data.me?.displayName || "Guest"}</p>
                  <p>
                    #{myRank || "-"} • {myStanding?.total ?? 0} pts • {formatDelta(data.standingsDelta[data.me?.memberId || ""] || 0)}
                  </p>
                  <p className="text-emerald-300">Reconnect saved {reconnectSaved ? "✅" : "—"}</p>
                </div>
                <div className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm">
                  PIN <span className="font-mono font-semibold">{data.league.code}</span>
                </div>
                <button
                  type="button"
                  onClick={copyPin}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <Link
                  href={`/join?code=${encodeURIComponent(data.league.code)}`}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs"
                >
                  Share
                </Link>
              </div>
            </div>
          </header>

          <section id="hot-seat" className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <h2 className="mb-3 text-lg font-semibold text-neutral-100">CHAOS HOT SEAT</h2>
            <div className="grid gap-3 xl:grid-cols-2">
              {data.hotSeatMatchups.map((matchup) => (
                <Link
                  key={matchup.id}
                  href={`/league/${leagueId}/bracket#region-${matchup.region.toLowerCase()}`}
                  className="rounded-lg border border-[#1f2937] bg-[#0f1623] p-3 transition duration-200 hover:brightness-110"
                >
                  <p className="text-sm font-semibold text-neutral-100">{matchup.label}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {matchup.teamA.seed} vs {matchup.teamB.seed} • {matchup.region}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-neutral-300">
                    <p>Hero owners: {joinOrDash(matchup.impact.heroOwners)}</p>
                    <p>Villain owners: {joinOrDash(matchup.impact.villainOwners)}</p>
                    <p>Cinderella owners: {joinOrDash(matchup.impact.cinderellaOwners)}</p>
                  </div>
                  <div className="mt-2 rounded bg-neutral-900/60 p-2 text-xs text-neutral-200">
                    <p>{matchup.potentialSwing.ifTeamAWins}</p>
                    <p className="mt-1">{matchup.potentialSwing.ifTeamBWins}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <MyTeam myPicks={data.myPicks} standingsRow={myStanding} resultByTeamId={resultByTeamId} />

          <section
            id="rivalries"
            className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]"
          >
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-100">RIVALRY MOMENTS</h2>
            {rivalryMoments.length === 0 ? (
              <p className="text-sm text-neutral-400">No rivalry swings yet.</p>
            ) : (
              <ul className="space-y-2">
                {rivalryMoments.map((event) => (
                  <li key={event.id} className="rounded-lg border border-[#1f2937] bg-[#0f1623] px-3 py-2 text-sm">
                    <p className="text-neutral-100">{formatRivalryMoment(event, data)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-[320px]">
          <LeaderboardPanel
            standings={data.standings}
            me={data.me}
            aliveRolesByMemberId={aliveRolesByMemberId}
            standingsDelta={data.standingsDelta}
            highlightEvents={data.highlightEvents}
            ownershipMap={data.ownershipMap}
          />

          <section id="feed">
            <LiveFeed
              allEvents={data.recentEvents}
              highlightEvents={data.highlightEvents}
              picks={data.picks}
              members={data.members}
              teams={data.teams}
              expanded={expandedFeed}
              onExpand={async () => {
                setExpandedFeed(true);
                await load(30, "all");
              }}
            />
          </section>
        </aside>
      </div>
    </main>
  );
}

function NavItem({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 transition duration-200 ${
        active
          ? "border-l-2 border-blue-400 bg-blue-500/10 text-neutral-100"
          : "text-neutral-300 hover:bg-neutral-700/40 hover:text-neutral-100"
      }`}
    >
      {children}
    </Link>
  );
}

function commandCta(
  status: WarRoomResponse["league"]["status"],
  leagueId: string,
  isAdmin: boolean,
) {
  if (status === "SETUP") {
    if (isAdmin) {
      return { kind: "link" as const, href: `/league/${leagueId}/lobby`, label: "Start Draft" };
    }
    return { kind: "anchor" as const, href: "#", label: "Waiting for host" };
  }
  if (status === "DRAFT") {
    return { kind: "link" as const, href: `/league/${leagueId}/draft`, label: "Return to Draft Room" };
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

  return `⚔ ${member?.displayName || "Manager"} ${delta >= 0 ? "+" : ""}${delta} • ${winnerTeam?.shortName || winnerTeam?.name || "Team"} over ${loserTeam?.shortName || loserTeam?.name || "Team"}`;
}
