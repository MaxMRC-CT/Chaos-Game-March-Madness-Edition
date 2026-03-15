"use client";

import Link from "next/link";
import { Filter, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { StickyUserStatus } from "@/app/league/[leagueId]/_components/sticky-user-status";
import { normalizeWarRoomPayload, isWarRoomErrorPayload } from "@/lib/war-room/normalize";
import { WarRoomResponse } from "../../dashboard/_components/types";

type FilterMode = "all" | "upsets" | "my-teams";

export default function GamesClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState(() => normalizeWarRoomPayload(initial));
  const [filter, setFilter] = useState<FilterMode>("all");

  const load = useCallback(async () => {
    const response = await fetch(`/api/war-room?leagueId=${leagueId}&limit=20`, {
      cache: "no-store",
    });
    const raw = await response.json();
    if (!response.ok || isWarRoomErrorPayload(raw)) return;
    setData(normalizeWarRoomPayload(raw));
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

  const myTeamIds = useMemo(() => new Set(data.myPicks.map((pick) => pick.teamId)), [data.myPicks]);
  const myStanding = data.me
    ? data.standings.find((row) => row.memberId === data.me?.memberId) ?? null
    : null;
  const myRank = data.me
    ? data.standings.findIndex((row) => row.memberId === data.me?.memberId) + 1
    : 0;
  const myDelta = data.me ? data.standingsDelta[data.me.memberId] ?? 0 : 0;

  const groupedGames = useMemo(() => {
    const groups = new Map<string, WarRoomResponse["games"]>();

    for (const game of data.games) {
      const upset =
        game.winner && game.loser ? game.winner.seed > game.loser.seed : false;
      const involvesMe =
        myTeamIds.has(game.winnerTeamId) || myTeamIds.has(game.loserTeamId);

      if (filter === "upsets" && !upset) continue;
      if (filter === "my-teams" && !involvesMe) continue;

      const round = game.round;
      groups.set(round, [...(groups.get(round) ?? []), game]);
    }

    return Array.from(groups.entries());
  }, [data.games, filter, myTeamIds]);

  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(data.me?.isAdmin)} />

        <div className="min-w-0 flex-1 space-y-3.5">
          <StickyUserStatus rank={myRank} points={myStanding?.total ?? 0} delta={myDelta} />

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-3 shadow-lg shadow-black/20 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Games
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  Tournament Results
                </h1>
              </div>
              <Link
                href={`/league/${leagueId}/bracket`}
                className="text-sm font-medium text-violet-300 hover:text-violet-200"
              >
                Open Full Bracket
              </Link>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1">
              {([
                ["all", "All"],
                ["upsets", "Upsets"],
                ["my-teams", "My Teams"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                    filter === value
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                      : "border-neutral-700 bg-neutral-800 text-neutral-300"
                  }`}
                >
                  <Filter className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {groupedGames.length === 0 ? (
            <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-8 text-center text-neutral-400">
              No games match this filter yet.
            </section>
          ) : (
            groupedGames.map(([round, games]) => (
              <section key={round} className="space-y-1">
                <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-1.5">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white">{formatRound(round)}</h2>
                  <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                    {games.length} games
                  </span>
                </div>
                <div className="space-y-1">
                  {games.map((game) => {
                    const upset =
                      game.winner && game.loser ? game.winner.seed > game.loser.seed : false;
                    const myImpact =
                      myTeamIds.has(game.winnerTeamId) || myTeamIds.has(game.loserTeamId);
                    return (
                      <article
                        key={game.id}
                        className="rounded-2xl border border-white/10 bg-neutral-900/95 px-3 py-1.5 shadow-lg shadow-black/20 sm:px-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold leading-5 text-white">
                              {game.winner?.name ?? "Winner"} beat {game.loser?.name ?? "Loser"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-400">
                              {game.winner?.seed ?? "—"} over {game.loser?.seed ?? "—"}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1">
                            {upset ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">
                                <Sparkles className="size-3" />
                                Upset
                              </span>
                            ) : null}
                            {myImpact ? (
                              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200">
                                My Team
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function formatRound(round: string) {
  if (round === "R64") return "Round of 64";
  if (round === "R32") return "Round of 32";
  if (round === "S16") return "Sweet 16";
  if (round === "E8") return "Elite 8";
  if (round === "F4") return "Final Four";
  if (round === "FINAL") return "Championship";
  return round;
}
