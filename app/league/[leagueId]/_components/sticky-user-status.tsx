"use client";

import { ScoreDeltaBadge } from "./score-delta-badge";

export function StickyUserStatus({
  rank,
  points,
  delta,
  className = "",
}: {
  rank: number;
  points: number;
  delta?: number;
  className?: string;
}) {
  return (
    <div className={`sticky top-2 z-20 lg:top-4 ${className}`}>
      <div className="mx-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-950/85 px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            You: {rank > 0 ? `#${rank}` : "Unranked"} • {points} pts
          </p>
        </div>
        {typeof delta === "number" ? <ScoreDeltaBadge delta={delta} todayLabel compact /> : null}
      </div>
    </div>
  );
}
