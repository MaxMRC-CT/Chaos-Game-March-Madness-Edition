"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LeagueSidebarNav } from "@/app/league/[leagueId]/_components/LeagueSidebarNav";
import { RankMovementIndicator } from "@/app/league/[leagueId]/_components/rank-movement-indicator";
import { ScoreDeltaBadge } from "@/app/league/[leagueId]/_components/score-delta-badge";
import { StickyUserStatus } from "@/app/league/[leagueId]/_components/sticky-user-status";
import { normalizeWarRoomPayload, isWarRoomErrorPayload } from "@/lib/war-room/normalize";
import { WarRoomResponse } from "../../dashboard/_components/types";

export default function StandingsClient({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState(() => normalizeWarRoomPayload(initial));
  const prevStandingsRef = useRef<WarRoomResponse["standings"] | null>(null);
  const [rankDelta, setRankDelta] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const response = await fetch(`/api/war-room?leagueId=${leagueId}&limit=20`, {
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

  const myStanding = data.me
    ? data.standings.find((row) => row.memberId === data.me?.memberId) ?? null
    : null;
  const myRank = data.me
    ? data.standings.findIndex((row) => row.memberId === data.me?.memberId) + 1
    : 0;
  const myDailyDelta = data.me ? data.standingsDelta[data.me.memberId] ?? 0 : 0;

  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(data.me?.isAdmin)} />

        <div className="min-w-0 flex-1 space-y-4">
          <StickyUserStatus rank={myRank} points={myStanding?.total ?? 0} delta={myDailyDelta} />

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-lg shadow-black/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Standings
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  Full Leaderboard
                </h1>
              </div>
              <Link
                href={`/league/${leagueId}/dashboard`}
                className="text-sm font-medium text-violet-300 hover:text-violet-200"
              >
                Back Home
              </Link>
            </div>
          </section>

          <div className="space-y-3">
            {data.standings.map((row, index) => {
              const isMe = row.memberId === data.me?.memberId;
              const delta = data.standingsDelta[row.memberId] ?? 0;
              const movement = rankDelta[row.memberId] ?? 0;
              const displayName = isMe ? "YOU" : row.displayName;

              return (
                <article
                  key={row.memberId}
                  className={`rounded-2xl border p-4 shadow-lg shadow-black/20 ${
                    isMe
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-white/10 bg-neutral-900/95"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        #{index + 1} {displayName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <RankMovementIndicator delta={movement} compact />
                        <ScoreDeltaBadge delta={delta} todayLabel compact />
                        <span>Hero {row.HERO ?? 0}</span>
                        <span>Villain {row.VILLAIN ?? 0}</span>
                        <span>Cinderella {row.CINDERELLA ?? 0}</span>
                        <span>Rivalry {row.rivalry ?? 0}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-white">{row.total}</p>
                      <div className="mt-1 flex justify-end">
                        <ScoreDeltaBadge delta={delta} compact />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
