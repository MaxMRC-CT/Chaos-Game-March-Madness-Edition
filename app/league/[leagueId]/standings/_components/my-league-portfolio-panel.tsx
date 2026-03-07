"use client";

import { BarChart3, Gauge, Shield, Sparkles, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";

const ROLE_STYLES = {
  HERO: "border-blue-500/50 bg-blue-500/10 text-blue-200",
  VILLAIN: "border-red-500/50 bg-red-500/10 text-red-200",
  CINDERELLA: "border-violet-500/50 bg-violet-500/10 text-violet-200",
} as const;

type SortMode = "default" | "leverage";

export function MyLeaguePortfolioPanel({
  data,
}: {
  data: WarRoomResponse & { myLeagueAnalytics: NonNullable<WarRoomResponse["myLeagueAnalytics"]> };
}) {
  const analytics = data.myLeagueAnalytics;
  const { myPicks, ownershipByRole } = data;
  const [sortBy, setSortBy] = useState<SortMode>("default");

  const leverageMap = useMemo(() => {
    const map = new Map<string, { points: number; leverage: number }>();
    for (const p of analytics.pickLeveragePerPick ?? []) {
      map.set(`${p.teamId}-${p.role}`, { points: p.points, leverage: p.leverage });
    }
    return map;
  }, [analytics.pickLeveragePerPick]);

  const sortedPicks = useMemo(() => {
    const list = [...myPicks];
    if (sortBy === "leverage") {
      list.sort((a, b) => {
        const la = leverageMap.get(`${a.teamId}-${a.role}`)?.leverage ?? 0;
        const lb = leverageMap.get(`${b.teamId}-${b.role}`)?.leverage ?? 0;
        return lb - la;
      });
    }
    return list;
  }, [myPicks, sortBy, leverageMap]);

  const top5 = data.top5LeveragePicks ?? [];

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

      {/* Your 6 picks with ownership and v2.3 leverage */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Target className="size-4" />
            Your 6 Picks
          </h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            aria-label="Sort picks"
          >
            <option value="default">Default</option>
            <option value="leverage">Sort by leverage</option>
          </select>
        </div>
        <ul className="space-y-2">
          {sortedPicks.map((pick) => {
            const obr = ownershipByRole?.[pick.teamId] ?? {
              heroPct: 0,
              villainPct: 0,
              cinderellaPct: 0,
            };
            const pct =
              pick.role === "HERO" ? obr.heroPct : pick.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;
            const lev = leverageMap.get(`${pick.teamId}-${pick.role}`);
            const name = pick.team.shortName || pick.team.name;
            return (
              <li
                key={`${pick.teamId}-${pick.role}`}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${ROLE_STYLES[pick.role]}`}
              >
                <span className="font-medium">{name}</span>
                <span className="flex items-center gap-2 text-xs">
                  {lev ? (
                    <span className="tabular-nums text-amber-300/90" title="Leverage">
                      {lev.leverage}
                    </span>
                  ) : null}
                  {pick.role} · {pct}% owned
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* v2.3 League-wide top 5 leverage picks */}
      {top5.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-300/90">
            <Zap className="size-4" />
            Top 5 League Leverage Picks
          </h3>
          <ul className="space-y-2">
            {top5.map((p, i) => (
              <li
                key={`${p.teamId}-${p.role}-${i}`}
                className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-neutral-900/60 px-3 py-2 text-sm"
              >
                <span className="font-medium text-neutral-100">
                  #{i + 1} {p.teamName} ({p.role})
                </span>
                <span className="text-xs tabular-nums text-amber-300/90">
                  {p.leverage} lev · {p.points} pts · {p.ownershipPct}% owned
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* v2.3 Projection preview for active teams */}
      {analytics.projectionPreviews && analytics.projectionPreviews.length > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-300/90">
            <Target className="size-4" />
            Next-Round Projections
          </h3>
          <ul className="space-y-2">
            {analytics.projectionPreviews.map((prev) => (
              <li
                key={`${prev.teamId}-${prev.role}`}
                className="rounded-lg border border-emerald-500/20 bg-neutral-900/60 px-3 py-2 text-sm"
              >
                <p className="font-medium text-neutral-100">
                  {prev.teamName} ({prev.role})
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  If {prev.role === "VILLAIN" ? "eliminated" : "wins"} next round → +{prev.youSwing} you / +{prev.leagueSwing} league / net ±{prev.netSwing}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* v2.3 Upset exposure summary */}
      {data.upsetExposure && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Gauge className="size-4" />
            Upset Exposure
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-violet-300">Cinderella</p>
              <p className="text-lg font-semibold tabular-nums text-neutral-100">
                {data.upsetExposure.totalCinderellaExposurePct}%
              </p>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-red-300">Villain</p>
              <p className="text-lg font-semibold tabular-nums text-neutral-100">
                {data.upsetExposure.totalVillainExposurePct}%
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">High seed (1–4) risk</p>
              <p className="text-sm text-neutral-300">
                H {data.upsetExposure.highSeedRiskSummary.heroExposurePct}% / V{" "}
                {data.upsetExposure.highSeedRiskSummary.villainExposurePct}% / C{" "}
                {data.upsetExposure.highSeedRiskSummary.cinderellaExposurePct}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* v2.2 Leverage analytics */}
      {(analytics.pickLeverage?.highestLeverageHit || analytics.pickLeverage?.mostValuableContrarianHit || (analytics.pickLeverage?.portfolioLeverage ?? 0) > 0) && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Zap className="size-4" />
            Leverage
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.pickLeverage && analytics.pickLeverage.portfolioLeverage > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-amber-300">Portfolio Leverage</p>
                <p className="text-lg font-semibold tabular-nums text-neutral-100">
                  {analytics.pickLeverage.portfolioLeverage}
                </p>
                <p className="text-xs text-neutral-400">Inverse-ownership weighted</p>
              </div>
            )}
            {analytics.pickLeverage?.highestLeverageHit ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                    Big Leverage Hit
                  </p>
                  <p className="mt-1 font-semibold text-neutral-100">
                    {analytics.pickLeverage.highestLeverageHit.teamName} ({analytics.pickLeverage.highestLeverageHit.role})
                  </p>
                  <p className="text-xs text-neutral-400">
                    {analytics.pickLeverage.highestLeverageHit.points} pts · {analytics.pickLeverage.highestLeverageHit.ownershipPct}% owned
                  </p>
                </div>
              </div>
            ) : null}
            {analytics.pickLeverage?.mostValuableContrarianHit && analytics.pickLeverage.mostValuableContrarianHit.teamId !== analytics.pickLeverage?.highestLeverageHit?.teamId ? (
              <div className="flex items-start gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-violet-300">
                    Contrarian Win
                  </p>
                  <p className="mt-1 font-semibold text-neutral-100">
                    {analytics.pickLeverage.mostValuableContrarianHit.teamName}
                  </p>
                  <p className="text-xs text-neutral-400">
                    +{analytics.pickLeverage.mostValuableContrarianHit.points} pts · only {analytics.pickLeverage.mostValuableContrarianHit.ownershipPct}% owned
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* v2.2 Portfolio personality */}
      {analytics.personality && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Gauge className="size-4" />
            Portfolio Personality
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Chalk</p>
              <p className="text-base font-semibold tabular-nums text-neutral-100">{analytics.personality.chalkIndex}</p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Leverage</p>
              <p className="text-base font-semibold tabular-nums text-neutral-100">{analytics.personality.leverageIndex}</p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Volatility</p>
              <p className="text-base font-semibold tabular-nums text-neutral-100">{analytics.personality.volatilityIndex}</p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Villain</p>
              <p className="text-base font-semibold tabular-nums text-neutral-100">{analytics.personality.villainAggressionScore}</p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Cinder</p>
              <p className="text-base font-semibold tabular-nums text-neutral-100">{analytics.personality.cinderellaRiskScore}</p>
            </div>
          </div>
        </div>
      )}

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
