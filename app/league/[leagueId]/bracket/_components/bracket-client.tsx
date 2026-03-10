"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function useBracketDebug() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setShow(new URLSearchParams(window.location.search).get("bracketDebug") === "1");
  }, []);
  return show;
}
import { NCAA_R64_MATCHUPS } from "@/lib/bracket/espnLayout";
import { buildTeamOwnershipMap } from "@/lib/league/ownership";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { RoundSelector, type RoundKey } from "./RoundSelector";
import { ZoomControls } from "./ZoomControls";
import { RegionTabs, type RegionKey } from "./RegionTabs";

const REGIONS: RegionKey[] = ["East", "West", "South", "Midwest"];
const ROUND_COLUMNS = [
  { key: "R64" as const, label: "Round of 64" },
  { key: "R32" as const, label: "Round of 32" },
  { key: "S16" as const, label: "Sweet 16" },
  { key: "E8" as const, label: "Elite 8" },
] as const;

type OwnershipFilter = "ALL" | "HERO" | "VILLAIN" | "CINDERELLA" | "UNOWNED";

const ROLE_BADGE = {
  HERO: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  VILLAIN: "bg-red-500/20 text-red-200 border-red-500/30",
  CINDERELLA: "bg-violet-500/20 text-violet-200 border-violet-500/30",
} as const;

type RoundCounts = { R64: number; R32: number; S16: number; E8: number; F4: number; NCG: number };

export default function BracketClient({
  leagueId,
  initial,
  roundCounts: _roundCounts,
}: {
  leagueId: string;
  initial: WarRoomResponse;
  roundCounts?: RoundCounts | null;
}) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<OwnershipFilter>("ALL");
  const [selectedRound, setSelectedRound] = useState<RoundKey>("R64");
  const [zoom, setZoom] = useState(1);
  const [mobileRegion, setMobileRegion] = useState<RegionKey>("East");

  const load = useCallback(async () => {
    const response = await fetch(`/api/war-room?leagueId=${leagueId}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    setData((await response.json()) as WarRoomResponse);
  }, [leagueId]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const ownershipByTeamId = useMemo(() => buildTeamOwnershipMap(data.picks), [data.picks]);
  const resultByTeamId = useMemo(() => {
    const map: Record<string, WarRoomResponse["teamResults"][number] | undefined> = {};
    for (const result of data.teamResults) map[result.teamId] = result;
    return map;
  }, [data.teamResults]);
  const teamById = useMemo(() => {
    const map: Record<string, WarRoomResponse["teams"][number]> = {};
    for (const team of data.teams) map[team.id] = team;
    return map;
  }, [data.teams]);

  const hasTeams = data.teams.length > 0;
  const hasGames = data.games.length > 0;
  const showDebug = useBracketDebug();

  const debugCountsByRound = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of data.games) {
      const key = g.round === "FINAL" ? "NCG" : g.round;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [data.games]);

  const handleResetView = useCallback(() => {
    setSelectedRound("R64");
    setZoom(1);
    setMobileRegion("East");
  }, []);

  return (
    <main className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex w-full max-w-[1800px] min-w-0 flex-1 gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(data.me?.isAdmin)} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="sticky top-0 z-10 shrink-0 rounded-xl border border-neutral-800 bg-neutral-900/95 px-4 py-4 shadow-lg backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl">
                  Full Bracket
                </h1>
                <p className="mt-0.5 text-sm text-neutral-400">
                  Ownership heatmap and role filters
                </p>
              </div>
              <Link
                href={`/league/${leagueId}/dashboard`}
                className="shrink-0 rounded text-sm font-medium text-neutral-300 underline-offset-4 transition hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                Back to War Room
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Ownership filter">
              {(["ALL", "HERO", "VILLAIN", "CINDERELLA", "UNOWNED"] as OwnershipFilter[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={filter === item}
                    onClick={() => setFilter(item)}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                      filter === item
                        ? "border-violet-500/60 bg-violet-500/20 text-violet-200"
                        : "border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-700/80 hover:text-neutral-200"
                    }`}
                  >
                    {item === "ALL"
                      ? "All"
                      : item === "UNOWNED"
                        ? "Unowned"
                        : item === "CINDERELLA"
                          ? "Cinderellas"
                          : `${item[0]}${item.slice(1).toLowerCase()}s`}
                  </button>
                ),
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral-800 pt-4">
              <RoundSelector value={selectedRound} onChange={setSelectedRound} />
              <ZoomControls zoom={zoom} onZoomChange={setZoom} />
              <button
                type="button"
                onClick={handleResetView}
                aria-label="Reset view to default round and zoom"
                className="inline-flex h-8 items-center rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 text-xs font-medium text-neutral-400 outline-none transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-700/80 hover:text-neutral-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                Reset view
              </button>
            </div>

            <div className="mt-4 lg:hidden">
              <span className="mb-1.5 block text-xs font-medium text-neutral-500">Region</span>
              <RegionTabs value={mobileRegion} onChange={setMobileRegion} />
            </div>

            {showDebug && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 font-mono text-xs text-amber-200">
                <div className="font-semibold text-amber-300">Bracket debug (?bracketDebug=1)</div>
                <div>games: {data.games.length} · teamResults: {data.teamResults.length} · teams: {data.teams.length}</div>
                <div>by round: {JSON.stringify(debugCountsByRound)}</div>
                {data.games.length > 0 && (
                  <div className="mt-1 truncate">
                    first game: {data.games[0].round} #{data.games[0].gameNo} → winner {data.games[0].winnerTeamId?.slice(0, 8)}… loser {data.games[0].loserTeamId?.slice(0, 8)}…
                  </div>
                )}
              </div>
            )}
          </header>

          {!hasTeams ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-neutral-600 bg-neutral-900/50 p-8 text-center text-neutral-400">
              <p>No teams loaded. Check league data or try again later.</p>
            </div>
          ) : (
            <div className="min-h-0 min-w-0 flex-1">
              <div className="h-full min-h-0 min-w-0 overflow-x-auto overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 transition-[background-color] duration-200">
                <div
                  className="inline-block min-h-full min-w-0 lg:flex lg:gap-6"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  <DesktopBracket
                    data={data}
                    teamById={teamById}
                    ownershipByTeamId={ownershipByTeamId}
                    resultByTeamId={resultByTeamId}
                    filter={filter}
                    selectedRound={selectedRound}
                    mobileRegion={mobileRegion}
                    hasGames={hasGames}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DesktopBracket({
  data,
  teamById,
  ownershipByTeamId,
  resultByTeamId,
  filter,
  selectedRound,
  mobileRegion,
  hasGames,
}: {
  data: WarRoomResponse;
  teamById: Record<string, WarRoomResponse["teams"][number]>;
  ownershipByTeamId: ReturnType<typeof buildTeamOwnershipMap>;
  resultByTeamId: Record<string, WarRoomResponse["teamResults"][number] | undefined>;
  filter: OwnershipFilter;
  selectedRound: RoundKey;
  mobileRegion: RegionKey;
  hasGames: boolean;
}) {
  const isFinalsRound = selectedRound === "F4" || selectedRound === "FINAL";

  if (isFinalsRound) {
    const finalsGames =
      selectedRound === "F4"
        ? data.games.filter((g) => g.round === "F4")
        : data.games.filter((g) => g.round === "FINAL" || g.round === "CHAMP");
    return (
      <section className="min-w-0 shrink-0 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 lg:min-w-[280px]">
        <h2 className="mb-3 text-base font-semibold tracking-tight text-neutral-100">
          {selectedRound === "F4" ? "Final Four" : "Championship"}
        </h2>
        {!hasGames || finalsGames.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-4 text-center text-sm text-neutral-500">
            Awaiting results
          </div>
        ) : (
          <ul className="space-y-2.5">
            {finalsGames
              .sort((a, b) => a.gameNo - b.gameNo)
              .map((game) => (
                <li
                  key={game.id}
                  className="rounded-lg border border-neutral-700/80 bg-neutral-800/60 p-2.5 transition-colors duration-150"
                >
                  <div className="space-y-1.5">
                    <TeamRow
                      team={teamById[game.winnerTeamId]}
                      owner={ownershipByTeamId[game.winnerTeamId]}
                      result={resultByTeamId[game.winnerTeamId]}
                      filter={filter}
                      fallbackLabel="Winner TBD"
                      matchRole="winner"
                    />
                    <TeamRow
                      team={teamById[game.loserTeamId]}
                      owner={ownershipByTeamId[game.loserTeamId]}
                      result={resultByTeamId[game.loserTeamId]}
                      filter={filter}
                      fallbackLabel="Loser TBD"
                      matchRole="loser"
                    />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    );
  }

  const regionRound = selectedRound as "R64" | "R32" | "S16" | "E8";
  const roundLabel = ROUND_COLUMNS.find((r) => r.key === regionRound)?.label ?? regionRound;

  return (
    <>
      {REGIONS.map((region) => {
        const regionNorm = region.toLowerCase();
        const regionTeams = data.teams.filter(
          (team) => (team.region ?? "").toLowerCase() === regionNorm,
        );
        const isMobileHidden = region !== mobileRegion;

        return (
          <section
            key={region}
            id={`region-${region.toLowerCase()}`}
            className={`min-w-0 shrink-0 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 lg:min-w-[280px] ${
              isMobileHidden ? "hidden lg:block" : ""
            }`}
            aria-labelledby={`region-${region}-heading`}
          >
            <h2 id={`region-${region}-heading`} className="mb-3 text-base font-semibold tracking-tight text-neutral-100">
              {region}
            </h2>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {roundLabel}
            </h3>
            <RegionRoundContent
              round={regionRound}
              region={region}
              regionTeams={regionTeams}
              games={data.games}
              teamById={teamById}
              ownershipByTeamId={ownershipByTeamId}
              resultByTeamId={resultByTeamId}
              filter={filter}
              hasGames={hasGames}
            />
          </section>
        );
      })}
    </>
  );
}

function RegionRoundContent({
  round,
  region,
  regionTeams,
  games,
  teamById,
  ownershipByTeamId,
  resultByTeamId,
  filter,
  hasGames,
}: {
  round: "R64" | "R32" | "S16" | "E8";
  region: string;
  regionTeams: WarRoomResponse["teams"];
  games: WarRoomResponse["games"];
  teamById: Record<string, WarRoomResponse["teams"][number]>;
  ownershipByTeamId: ReturnType<typeof buildTeamOwnershipMap>;
  resultByTeamId: Record<string, WarRoomResponse["teamResults"][number] | undefined>;
  filter: OwnershipFilter;
  hasGames: boolean;
}) {
  const matchups = getMatchupsForRound({
    round,
    region,
    teams: regionTeams,
    games,
    teamById,
  });

  if (regionTeams.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-4 text-center text-sm text-neutral-500">
        No teams in this region
      </div>
    );
  }

  if (matchups.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-4 text-center text-sm text-neutral-500">
        Awaiting results
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {matchups.map(({ pair, winnerTeamId }, index) => {
        const roleFor = (teamId: string): MatchRole =>
          winnerTeamId === null ? "neutral" : teamId === winnerTeamId ? "winner" : "loser";
        if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.search.includes("bracketDebug=1") && index === 0) {
          console.debug("[RegionRoundContent] matchup", { region, round, teamA: pair[0], teamB: pair[1], winnerTeamId, row0Role: roleFor(pair[0]), row1Role: roleFor(pair[1]) });
        }
        return (
          <li
            key={`${region}-${round}-${index}`}
            className="rounded-lg border border-neutral-700/80 bg-neutral-800/60 p-2.5 transition-colors duration-150"
          >
            <div className="space-y-1.5">
              <TeamRow
                team={teamById[pair[0]]}
                owner={ownershipByTeamId[pair[0]]}
                result={resultByTeamId[pair[0]]}
                filter={filter}
                matchRole={roleFor(pair[0])}
              />
              <TeamRow
                team={teamById[pair[1]]}
                owner={ownershipByTeamId[pair[1]]}
                result={resultByTeamId[pair[1]]}
                filter={filter}
                matchRole={roleFor(pair[1])}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function getMatchupsForRound({
  round,
  region,
  teams,
  games,
  teamById,
}: {
  round: "R64" | "R32" | "S16" | "E8";
  region: string;
  teams: WarRoomResponse["teams"];
  games: WarRoomResponse["games"];
  teamById: Record<string, WarRoomResponse["teams"][number]>;
}): { pair: [string, string]; winnerTeamId: string | null }[] {
  const norm = (r: string) => (r ?? "").toLowerCase();
  const regionNorm = norm(region);
  type TeamLike = { region?: string };
  const getWinner = (g: WarRoomResponse["games"][number]): TeamLike | undefined =>
    teamById[g.winnerTeamId] ?? (g as { winner?: TeamLike }).winner;
  const getLoser = (g: WarRoomResponse["games"][number]): TeamLike | undefined =>
    teamById[g.loserTeamId] ?? (g as { loser?: TeamLike }).loser;
  const regionOf = (t: TeamLike | undefined) => (t?.region ?? "").trim().toLowerCase();

  if (round === "R64") {
    const r64Games = games.filter((game) => game.round === "R64");
    const seeded = buildSeedMatchups(teams);
    const byGameNo = r64Games
      .filter((game) => {
        const winner = getWinner(game);
        const loser = getLoser(game);
        const pass = regionOf(winner) === regionNorm && regionOf(loser) === regionNorm;
        if (process.env.NODE_ENV === "development" && r64Games.indexOf(game) < 2) {
          console.debug("[getMatchupsForRound] R64", region, {
            gameNo: game.gameNo,
            winnerInMap: Boolean(teamById[game.winnerTeamId]),
            loserInMap: Boolean(teamById[game.loserTeamId]),
            winnerRegion: regionOf(winner) || "(missing)",
            loserRegion: regionOf(loser) || "(missing)",
            pass,
          });
        }
        return pass;
      })
      .sort((a, b) => a.gameNo - b.gameNo)
      .map((game) => ({
        pair: [game.winnerTeamId, game.loserTeamId] as [string, string],
        winnerTeamId: game.winnerTeamId,
      }));

    if (process.env.NODE_ENV === "development" && region === "East") {
      console.debug("[getMatchupsForRound] R64 summary", {
        region,
        r64Total: r64Games.length,
        byGameNoLength: byGameNo.length,
        teamByIdSize: Object.keys(teamById).length,
        usingSeeded: byGameNo.length === 0,
      });
    }
    return byGameNo.length > 0
      ? byGameNo
      : seeded.map((p) => ({ pair: [p[0].id, p[1].id] as [string, string], winnerTeamId: null }));
  }
  return games
    .filter((g) => g.round === round)
    .filter((g) => {
      const winner = getWinner(g);
      const loser = getLoser(g);
      return regionOf(winner) === regionNorm || regionOf(loser) === regionNorm;
    })
    .sort((a, b) => a.gameNo - b.gameNo)
    .map((g) => ({ pair: [g.winnerTeamId, g.loserTeamId] as [string, string], winnerTeamId: g.winnerTeamId }));
}

function buildSeedMatchups(teams: WarRoomResponse["teams"]) {
  const teamBySeed = new Map(teams.map((t) => [t.seed, t]));
  const pairs: Array<[WarRoomResponse["teams"][number], WarRoomResponse["teams"][number]]> = [];
  for (const [seedA, seedB] of NCAA_R64_MATCHUPS) {
    const teamA = teamBySeed.get(seedA);
    const teamB = teamBySeed.get(seedB);
    if (teamA && teamB) pairs.push([teamA, teamB]);
  }
  return pairs;
}

export type MatchRole = "winner" | "loser" | "neutral";

function TeamRow({
  team,
  owner,
  result,
  filter,
  fallbackLabel = "TBD",
  matchRole,
}: {
  team: WarRoomResponse["teams"][number] | undefined;
  owner: ReturnType<typeof buildTeamOwnershipMap>[string] | undefined;
  result: WarRoomResponse["teamResults"][number] | undefined;
  filter: OwnershipFilter;
  fallbackLabel?: string;
  /** When set, row styling is based on this matchup outcome only (not global eliminatedRound). */
  matchRole?: MatchRole;
}) {
  if (!team) {
    return (
      <div className="rounded-lg border border-neutral-700/80 bg-neutral-800/40 px-2.5 py-1.5 text-xs text-neutral-500">
        {fallbackLabel}
      </div>
    );
  }
  const owners = Array.isArray(owner) ? owner : owner ? [owner] : [];
  const isWinner =
    matchRole === "winner" ||
    (matchRole == null && result != null
      ? (result.eliminatedRound === null || result.eliminatedRound === "CHAMP")
      : false);
  const isLoser =
    matchRole === "loser" ||
    (matchRole == null && result != null
      ? (result.eliminatedRound != null && result.eliminatedRound !== "CHAMP")
      : false);
  const matchesFilter = matchesOwnershipFilter(owners, filter);

  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 transition-all duration-150 ${
        isWinner
          ? "border-emerald-500/50 bg-emerald-500/15 text-neutral-50"
          : isLoser
            ? "border-neutral-700/60 bg-neutral-900/80 text-neutral-500"
            : "border-neutral-700/80 bg-neutral-800/60 text-neutral-200"
      } ${owners.length > 0 ? "opacity-100" : "opacity-50"} ${!matchesFilter ? "opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums ${
              isWinner ? "bg-emerald-500/30 text-emerald-100" : "bg-neutral-700/80 text-neutral-400"
            }`}
          >
            {team.seed}
          </span>
          <span className={`truncate text-sm font-medium ${isWinner ? "text-neutral-50" : isLoser ? "text-neutral-500" : "text-neutral-200"}`}>
            {team.shortName || team.name}
          </span>
        </div>
        {owners.length > 0 ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 text-[10px]">
            {[...new Set(owners.map((o) => o.role))].map((role) => {
              const names = owners.filter((o) => o.role === role).map((o) => o.ownerDisplayName);
              return (
                <div key={role} className="flex items-center gap-1">
                  <span className={`rounded border px-1.5 py-0.5 font-medium ${ROLE_BADGE[role]}`}>
                    {role === "HERO" ? "H" : role === "VILLAIN" ? "V" : "C"}
                  </span>
                  <span className="max-w-[80px] truncate rounded bg-neutral-700/80 px-1.5 py-0.5 text-neutral-300" title={names.join(", ")}>
                    {names.join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function matchesOwnershipFilter(
  owner: ReturnType<typeof buildTeamOwnershipMap>[string] | undefined,
  filter: OwnershipFilter,
) {
  const list = Array.isArray(owner) ? owner : owner ? [owner] : [];
  if (filter === "ALL") return true;
  if (filter === "UNOWNED") return list.length === 0;
  if (list.length === 0) return false;
  return list.some((o) => o.role === filter);
}

