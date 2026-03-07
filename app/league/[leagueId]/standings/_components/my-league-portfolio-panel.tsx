"use client";

import { BarChart3, Shield, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";

const ROLE_STYLES = {
  HERO: "border-blue-500/50 bg-blue-500/10 text-blue-200",
  VILLAIN: "border-red-500/50 bg-red-500/10 text-red-200",
  CINDERELLA: "border-violet-500/50 bg-violet-500/10 text-violet-200",
} as const;

export function MyLeaguePortfolioPanel({
  data,
}: {
  data: WarRoomResponse & { myLeagueAnalytics: NonNullable<WarRoomResponse["myLeagueAnalytics"]> };
}) {
  const analytics = data.myLeagueAnalytics;
  const { myPicks, ownershipByRole } = data;

  return (
    <section className="space-y-6 rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a] sm:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-100">Strategic Portfolio</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Ownership intelligence, score breakdown, and standout picks
        </p>
      </div>

      {/* Score by role */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
          <BarChart3 className="size-4" />
          Score by Role
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-blue-300">Hero</p>
            <p className="text-lg font-semibold tabular-nums text-neutral-100">
              {analytics.scoreByRole.hero}
            </p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-red-300">Villain</p>
            <p className="text-lg font-semibold tabular-nums text-neutral-100">
              {analytics.scoreByRole.villain}
            </p>
          </div>
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-violet-300">Cinderella</p>
            <p className="text-lg font-semibold tabular-nums text-neutral-100">
              {analytics.scoreByRole.cinderella}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-600 bg-neutral-800/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Total</p>
            <p className="text-lg font-semibold tabular-nums text-neutral-100">
              {analytics.scoreByRole.total}
            </p>
          </div>
        </div>
      </div>

      {/* Your 6 picks with ownership */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
          <Target className="size-4" />
          Your 6 Picks
        </h3>
        <ul className="space-y-2">
          {myPicks.map((pick) => {
            const obr = ownershipByRole?.[pick.teamId] ?? {
              heroPct: 0,
              villainPct: 0,
              cinderellaPct: 0,
            };
            const pct =
              pick.role === "HERO" ? obr.heroPct : pick.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;
            const name = pick.team.shortName || pick.team.name;
            return (
              <li
                key={`${pick.teamId}-${pick.role}`}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${ROLE_STYLES[pick.role]}`}
              >
                <span className="font-medium">{name}</span>
                <span className="text-xs">
                  {pick.role} · {pct}% owned
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Insights grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {analytics.mostUniquePick ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                Most Unique Pick
              </p>
              <p className="mt-1 font-semibold text-neutral-100">
                {analytics.mostUniquePick.teamName} ({analytics.mostUniquePick.role})
              </p>
              <p className="text-sm text-neutral-400">
                Only {analytics.mostUniquePick.ownershipPct}% of league owns
              </p>
            </div>
          </div>
        ) : null}

        {analytics.chalkiestPick ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <TrendingUp className="mt-0.5 size-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-300">
                Chalkiest Pick
              </p>
              <p className="mt-1 font-semibold text-neutral-100">
                {analytics.chalkiestPick.teamName} ({analytics.chalkiestPick.role})
              </p>
              <p className="text-sm text-neutral-400">
                {analytics.chalkiestPick.ownershipPct}% of league
              </p>
            </div>
          </div>
        ) : null}

        {analytics.biggestVillainHit ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <Shield className="mt-0.5 size-5 shrink-0 text-red-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-red-300">
                Biggest Villain Hit
              </p>
              <p className="mt-1 font-semibold text-neutral-100">
                {analytics.biggestVillainHit.teamName}
              </p>
              <p className="text-sm text-neutral-400">
                +{analytics.biggestVillainHit.points} pts
              </p>
            </div>
          </div>
        ) : null}

        {analytics.bestCinderellaPerformer ? (
          <div className="flex items-start gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
            <TrendingDown className="mt-0.5 size-5 shrink-0 text-violet-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-violet-300">
                Best Cinderella Performer
              </p>
              <p className="mt-1 font-semibold text-neutral-100">
                {analytics.bestCinderellaPerformer.teamName}
              </p>
              <p className="text-sm text-neutral-400">
                {analytics.bestCinderellaPerformer.points} pts
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
