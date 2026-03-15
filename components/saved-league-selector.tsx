"use client";

import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import type { SavedLeagueSession } from "@/lib/client/device-session";

function formatLastVisited(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    "day",
  );
}

export function SavedLeagueSelector({
  leagues,
  onEnterLeague,
  onRemoveLeague,
  pendingLeagueId,
  message,
  title = "Choose Your League",
  subtitle = "Pick up where you left off on this device.",
}: {
  leagues: SavedLeagueSession[];
  onEnterLeague: (league: SavedLeagueSession) => void;
  onRemoveLeague: (leagueId: string) => void;
  pendingLeagueId?: string | null;
  message?: string | null;
  title?: string;
  subtitle?: string;
}) {
  return (
    <main className="app-shell app-safe-top app-safe-bottom mx-auto flex w-full max-w-md flex-col justify-center gap-4 bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] px-4 text-white">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="text-sm text-neutral-400">{subtitle}</p>
      </div>

      {message ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {message}
        </div>
      ) : null}

      <div className="space-y-3">
        {leagues.map((league) => {
          const isPending = pendingLeagueId === league.leagueId;
          return (
            <div
              key={league.leagueId}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{league.leagueName}</p>
                  <p className="mt-1 text-sm text-neutral-400">PIN: {league.leagueCode}</p>
                  <p className="mt-2 text-sm text-neutral-300">You: {league.nickname}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Last visited {formatLastVisited(league.lastVisitedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLeague(league.leagueId)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-neutral-400 transition hover:border-red-400/40 hover:text-red-300"
                  aria-label={`Remove ${league.leagueName}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onEnterLeague(league)}
                disabled={isPending}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#fb6223] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fb6223]/20 transition hover:bg-[#ff7a3d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Entering League…
                  </span>
                ) : (
                  "Enter League"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <Link
        href="/join"
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
      >
        Join Another League
      </Link>
    </main>
  );
}
