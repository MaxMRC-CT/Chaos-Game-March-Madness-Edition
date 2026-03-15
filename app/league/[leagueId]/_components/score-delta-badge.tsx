"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function ScoreDeltaBadge({
  delta,
  todayLabel = false,
  compact = false,
}: {
  delta: number;
  todayLabel?: boolean;
  compact?: boolean;
}) {
  const value = delta > 0 ? `+${delta}` : `${delta}`;
  const suffix = todayLabel ? " today" : "";

  if (delta > 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium text-emerald-300 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        <ArrowUpRight className={compact ? "size-3" : "size-3.5"} />
        {value}
        {suffix}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium text-red-300 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        <ArrowDownRight className={compact ? "size-3" : "size-3.5"} />
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium text-neutral-400 ${
        compact ? "text-[11px]" : "text-xs"
      }`}
    >
      <Minus className={compact ? "size-3" : "size-3.5"} />
      0
      {suffix}
    </span>
  );
}
