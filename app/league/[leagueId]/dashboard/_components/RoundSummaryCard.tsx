"use client";

import { Crown, Flame, Skull, Zap } from "lucide-react";
import type { WarRoomResponse } from "./types";

type RoundSummary = NonNullable<WarRoomResponse["roundSummary"]>;

type RecapCardProps = {
  title: string;
  playerName: string;
  delta?: string | null;
  deltaVariant?: "positive" | "neutral" | "negative";
  suffix?: string;
  icon: React.ReactNode;
};

function RecapCard({ title, playerName, delta, deltaVariant = "neutral", suffix, icon }: RecapCardProps) {
  const deltaColor =
    deltaVariant === "positive"
      ? "text-emerald-400"
      : deltaVariant === "negative"
        ? "text-red-400"
        : "text-neutral-500";

  return (
    <div className="flex min-h-[88px] min-w-0 items-start gap-4 rounded-xl border border-white/8 bg-black/25 px-5 py-5">
      <span className="flex shrink-0 items-center" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <span className="text-base font-semibold text-white">{playerName}</span>
          {delta != null && delta !== "" && (
            <span className={`text-base font-semibold tabular-nums ${deltaColor}`}>{delta}</span>
          )}
          {suffix != null && suffix !== "" && (
            <span className="text-base text-neutral-400">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoundSummaryCard({ roundSummary }: { roundSummary: RoundSummary }) {
  const cards: Array<{ key: string; node: React.ReactNode }> = [];

  if (roundSummary.chaosSpike) {
    cards.push({
      key: "Chaos Spike",
      node: (
        <RecapCard
        title="Chaos Spike"
        playerName={roundSummary.chaosSpike.displayName || "Unknown"}
        delta={`+${roundSummary.chaosSpike.spots}`}
        deltaVariant="positive"
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 shadow-[0_0_12px_rgba(251,146,60,0.2)]">
            <Flame className="size-5 text-amber-400" />
          </span>
        }
        />
      ),
    });
  }
  if (roundSummary.villainShockwave) {
    cards.push({
      key: "Villain Shockwave",
      node: (
        <RecapCard
        title="Villain Shockwave"
        playerName={roundSummary.villainShockwave.teamName}
        suffix={`(${roundSummary.villainShockwave.heroPct}% hero chalk)`}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 shadow-[0_0_12px_rgba(248,113,113,0.2)]">
            <Zap className="size-5 text-red-400" />
          </span>
        }
        />
      ),
    });
  }
  if (roundSummary.chalkCollapse) {
    cards.push({
      key: "Chalk Collapse",
      node: (
        <RecapCard
        title="Chalk Collapse"
        playerName={roundSummary.chalkCollapse.teamName}
        suffix={`(${roundSummary.chalkCollapse.heroPct}% owned)`}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-500/10 shadow-[0_0_10px_rgba(115,115,115,0.15)]">
            <Skull className="size-5 text-neutral-400" />
          </span>
        }
        />
      ),
    });
  }
  if (roundSummary.leverageLeader) {
    cards.push({
      key: "Leverage Leader",
      node: (
        <RecapCard
        title="Leverage Leader"
        playerName={roundSummary.leverageLeader.displayName || "Unknown"}
        suffix={`(${roundSummary.leverageLeader.chaosIndex} chaos)`}
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
            <Crown className="size-5 text-amber-300" />
          </span>
        }
        />
      ),
    });
  }

  if (cards.length === 0) return null;

  return (
    <section
      className="w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/95 to-neutral-950/95 px-5 py-6 shadow-[0_0_24px_rgba(251,98,35,0.06)] sm:px-6 sm:py-6"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(251,98,35,0.03) 0%, transparent 50%)`,
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Round Recap
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ key, node }) => (
          <div key={key}>{node}</div>
        ))}
      </div>
    </section>
  );
}
