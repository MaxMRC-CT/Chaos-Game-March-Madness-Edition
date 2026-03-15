"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { LiveAdminConsoleData } from "./types";

export function LiveAdminHeader({
  data,
  loading,
  onRefresh,
  onSignOut,
}: {
  data: LiveAdminConsoleData;
  loading: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-[#fb6223]/30 bg-[#fb6223]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08d]">
            LIVE TOURNAMENT ADMIN
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Chaos League Live Admin
          </h1>
          <p className="mt-1 text-sm text-neutral-300">
            {data.league.year} NCAA Tournament
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            {data.summary.currentRoundLabel} • {data.summary.pendingCount} pending •{" "}
            {data.summary.completedCount} completed
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Last updated: {formatTimestamp(data.summary.lastUpdatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/league/${data.league.id}/dashboard`}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
          >
            Public Dashboard
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return "No live results yet";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
