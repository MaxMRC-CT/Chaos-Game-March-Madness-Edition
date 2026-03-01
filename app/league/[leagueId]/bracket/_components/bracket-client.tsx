"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTeamOwnershipMap } from "@/lib/league/ownership";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";
import { BrandLockup } from "@/app/(dashboard)/_components/BrandLockup";

const REGIONS = ["East", "West", "South", "Midwest"] as const;
const ROUND_COLUMNS = [
  { key: "R64", label: "Round of 64" },
  { key: "R32", label: "Round of 32" },
  { key: "S16", label: "Sweet 16" },
  { key: "E8", label: "Elite 8" },
] as const;

type OwnershipFilter = "ALL" | "HERO" | "VILLAIN" | "CINDERELLA" | "UNOWNED";

const ROLE_BADGE = {
  HERO: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  VILLAIN: "bg-red-500/20 text-red-200 border-red-500/30",
  CINDERELLA: "bg-violet-500/20 text-violet-200 border-violet-500/30",
} as const;

export default function BracketClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<OwnershipFilter>("ALL");

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

  return (
    <main className="min-h-dvh text-neutral-100">
      <div className="mx-auto flex max-w-[1800px] gap-4 p-4">
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[240px] shrink-0 rounded-xl border border-[#1f2937] bg-[#111827] p-4 lg:block">
          <BrandLockup />
          <nav className="mt-4 space-y-1 text-sm">
            <NavItem href={`/league/${leagueId}/dashboard`}>🏟 War Room</NavItem>
            <NavItem href={`/league/${leagueId}/bracket`} active>
              🧩 Full Bracket
            </NavItem>
            <NavItem href={`/league/${leagueId}/standings`}>🏆 Power Rankings</NavItem>
            <NavItem href={`/league/${leagueId}/dashboard#rivalries`}>⚔ Rivalries</NavItem>
            <NavItem href={`/league/${leagueId}/dashboard#feed`}>📡 Live Feed</NavItem>
            {data.me?.isAdmin ? <NavItem href={`/league/${leagueId}/admin/results`}>⚙ Admin</NavItem> : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <header className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Full Bracket</h1>
                <p className="text-sm text-neutral-400">Ownership heatmap + role filters</p>
              </div>
              <Link href={`/league/${leagueId}/dashboard`} className="text-sm underline text-neutral-300">
                Back to War Room
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(["ALL", "HERO", "VILLAIN", "CINDERELLA", "UNOWNED"] as OwnershipFilter[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-full border px-2 py-1 ${
                      filter === item
                        ? "border-neutral-500 bg-neutral-700 text-white"
                        : "border-[#1f2937] bg-[#0f1623] text-neutral-300"
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
          </header>

          <div className="space-y-4">
            {REGIONS.map((region) => {
              const regionTeams = data.teams.filter((team) => team.region === region);
              if (regionTeams.length === 0) return null;

              return (
                <section
                  key={region}
                  id={`region-${region.toLowerCase()}`}
                  className="rounded-xl border border-[#1f2937] bg-[#111827] p-3"
                >
                  <h2 className="mb-3 text-base font-semibold text-neutral-100">{region}</h2>
                  <div className="grid gap-3 xl:grid-cols-4">
                    {ROUND_COLUMNS.map((round) => {
                      const matchups = getMatchupsForRound({
                        round: round.key,
                        region,
                        teams: regionTeams,
                        games: data.games,
                        teamById,
                      });

                      return (
                        <div key={round.key} className="space-y-2 rounded-lg border border-[#1f2937] bg-[#0f1623] p-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            {round.label}
                          </h3>

                          {matchups.length === 0 ? (
                            <div className="rounded-md border border-[#1f2937] bg-[#0b0f14] px-2 py-2 text-xs text-neutral-500">
                              Awaiting results
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {matchups.map((matchup, index) => (
                                <li
                                  key={`${region}-${round.key}-${index}`}
                                  className="rounded-md border border-[#1f2937] bg-[#0b0f14] p-2"
                                >
                                  <div className="space-y-1.5">
                                    <TeamRow
                                      team={teamById[matchup[0]]}
                                      owner={ownershipByTeamId[matchup[0]]}
                                      result={resultByTeamId[matchup[0]]}
                                      filter={filter}
                                    />
                                    <TeamRow
                                      team={teamById[matchup[1]]}
                                      owner={ownershipByTeamId[matchup[1]]}
                                      result={resultByTeamId[matchup[1]]}
                                      filter={filter}
                                    />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </main>
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
}) {
  if (round === "R64") {
    const seeded = buildSeedMatchups(teams);
    const byGameNo = games
      .filter((game) => game.round === "R64")
      .filter((game) => {
        const winner = teamById[game.winnerTeamId];
        const loser = teamById[game.loserTeamId];
        return winner?.region === region && loser?.region === region;
      })
      .sort((a, b) => a.gameNo - b.gameNo)
      .map((game) => [game.winnerTeamId, game.loserTeamId] as const);

    return byGameNo.length > 0 ? byGameNo : seeded.map((pair) => [pair[0].id, pair[1].id] as const);
  }

  return games
    .filter((game) => game.round === round)
    .filter((game) => {
      const winner = teamById[game.winnerTeamId];
      const loser = teamById[game.loserTeamId];
      return winner?.region === region || loser?.region === region;
    })
    .sort((a, b) => a.gameNo - b.gameNo)
    .map((game) => [game.winnerTeamId, game.loserTeamId] as const);
}

function buildSeedMatchups(teams: WarRoomResponse["teams"]) {
  const sorted = [...teams].sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));
  const pairs: Array<[WarRoomResponse["teams"][number], WarRoomResponse["teams"][number]]> = [];

  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    pairs.push([sorted[left], sorted[right]]);
    left += 1;
    right -= 1;
  }

  return pairs;
}

function TeamRow({
  team,
  owner,
  result,
  filter,
}: {
  team: WarRoomResponse["teams"][number] | undefined;
  owner: ReturnType<typeof buildTeamOwnershipMap>[string] | undefined;
  result: WarRoomResponse["teamResults"][number] | undefined;
  filter: OwnershipFilter;
}) {
  if (!team) {
    return (
      <div className="rounded-md border border-[#1f2937] bg-[#111827] px-2 py-1.5 text-xs text-neutral-500">
        TBD
      </div>
    );
  }

  const eliminatedRound = result?.eliminatedRound;
  const isLoser = Boolean(eliminatedRound && eliminatedRound !== "CHAMP");
  const isWinner = Boolean(result) && (eliminatedRound === null || eliminatedRound === "CHAMP");
  const matchesFilter = matchesOwnershipFilter(owner, filter);

  return (
    <div
      className={`rounded-md border px-2 py-1.5 transition duration-150 ${
        isWinner
          ? "border-emerald-500/40 bg-emerald-500/10"
          : isLoser
            ? "border-[#1f2937] bg-[#0d1118]"
            : "border-[#1f2937] bg-[#111827]"
      } ${owner ? "opacity-100" : "opacity-45"} ${matchesFilter ? "brightness-110" : "opacity-30"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="mr-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">{team.seed}</span>
          <span className="truncate text-sm text-neutral-100">{team.shortName || team.name}</span>
        </div>
        {owner ? (
          <div className="flex items-center gap-1 text-[10px]">
            <span className={`rounded border px-1.5 py-0.5 ${ROLE_BADGE[owner.role]}`}>
              {owner.role === "HERO" ? "H" : owner.role === "VILLAIN" ? "V" : "C"}
            </span>
            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-200">{owner.ownerDisplayName}</span>
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
  if (filter === "ALL") return true;
  if (filter === "UNOWNED") return !owner;
  if (!owner) return false;
  return owner.role === filter;
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
          ? "border-l-2 border-violet-400 bg-violet-500/10 text-neutral-100"
          : "text-neutral-300 hover:bg-neutral-700/40 hover:text-neutral-100"
      }`}
    >
      {children}
    </Link>
  );
}
