"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export function RankMovementIndicator({
  delta,
  compact = false,
}: {
  delta: number;
  compact?: boolean;
}) {
  const absDelta = Math.abs(delta);
  const label = delta > 0 ? `up ${absDelta}` : delta < 0 ? `down ${absDelta}` : "unchanged";

  if (delta > 0) {
    return (
      <span
        aria-label={label}
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-300 ${
          compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        <ArrowUp className={compact ? "size-3" : "size-3.5"} />
        {absDelta}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span
        aria-label={label}
        className={`inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 font-medium text-red-300 ${
          compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        <ArrowDown className={compact ? "size-3" : "size-3.5"} />
        {absDelta}
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800/90 font-medium text-neutral-400 ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Minus className={compact ? "size-3" : "size-3.5"} />
    </span>
  );
}
