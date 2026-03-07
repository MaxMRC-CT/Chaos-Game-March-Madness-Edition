"use client";

import { motion } from "framer-motion";
import { BarChart3, ChevronDown, ChevronUp, Gauge, Shield, Sparkles, Swords, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";
import {
  getAntiChalkExposureExplanation,
  getAntiChalkExposureLabel,
  getFieldAlignmentExplanation,
  getFieldAlignmentLabel,
  getRiskProfileExplanation,
  getRiskProfileLabel,
  getUpsetDependencyExplanation,
  getUpsetDependencyLabel,
  getUpsideVsFieldExplanation,
  getUpsideVsFieldLabel,
} from "@/lib/analytics/identity";

function ChaosIndexCell({ value, label }: { value: number; label: string }) {
  const prevRef = useRef<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (prevRef.current !== null && prevRef.current !== value) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 400);
      return () => clearTimeout(t);
    }
    prevRef.current = value;
  }, [value]);
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-300">{label}</p>
      <motion.p
        className="text-lg font-semibold tabular-nums text-neutral-100"
        animate={pulsing ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.p>
      <p className="text-xs text-neutral-400">Inverse-ownership weighted</p>
    </div>
  );
}

const ROLE_STYLES = {
  HERO: "border-blue-500/50 bg-blue-500/10 text-blue-200",
  VILLAIN: "border-red-500/50 bg-red-500/10 text-red-200",
  CINDERELLA: "border-violet-500/50 bg-violet-500/10 text-violet-200",
} as const;

type SortMode = "default" | "leverage";

type IdentityBlock = NonNullable<WarRoomResponse["myLeagueAnalytics"]>["identity"];

function IdentityMetricCard({
  label,
  score,
  interpretationLabel,
  explanation,
}: {
  label: string;
  score: number;
  interpretationLabel: string;
  explanation: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2.5">
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</p>
        <span className="text-xl font-semibold tabular-nums text-neutral-100">{score}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-neutral-700">
        <div
          className="h-full rounded-full bg-amber-500/60"
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <p className="mt-1.5 text-sm font-medium text-amber-200/90">{interpretationLabel}</p>
      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{explanation}</p>
    </div>
  );
}

function PortfolioIdentityBlock({ identity }: { identity: NonNullable<IdentityBlock> }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const metrics = [
    {
      label: "Field Alignment",
      score: identity.fieldAlignment,
      interpretationLabel: getFieldAlignmentLabel(identity.fieldAlignment),
      explanation: getFieldAlignmentExplanation(identity.fieldAlignment),
    },
    {
      label: "Upside vs Field",
      score: identity.upsideVsField,
      interpretationLabel: getUpsideVsFieldLabel(identity.upsideVsField),
      explanation: getUpsideVsFieldExplanation(identity.upsideVsField),
    },
    {
      label: "Risk Profile",
      score: identity.riskProfile,
      interpretationLabel: getRiskProfileLabel(identity.riskProfile),
      explanation: getRiskProfileExplanation(identity.riskProfile),
    },
    {
      label: "Anti-Chalk Exposure",
      score: identity.antiChalkExposure,
      interpretationLabel: getAntiChalkExposureLabel(identity.antiChalkExposure),
      explanation: getAntiChalkExposureExplanation(identity.antiChalkExposure),
    },
    {
      label: "Upset Dependency",
      score: identity.upsetDependency,
      interpretationLabel: getUpsetDependencyLabel(identity.upsetDependency),
      explanation: getUpsetDependencyExplanation(identity.upsetDependency),
    },
  ];
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
        <Gauge className="size-4" />
        Portfolio Identity
      </h3>
      <p className="mb-3 text-xs text-neutral-500">
        Locked at tip-off — your strategic identity for the season
      </p>
      <div className="relative mb-4 overflow-hidden rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.08)_0%,transparent_70%)] before:opacity-100">
        <p className="relative text-lg font-semibold text-amber-200">
          {identity.archetype.name}
        </p>
        <p className="relative mt-0.5 text-sm text-muted-foreground">{identity.archetype.explanation}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <IdentityMetricCard key={m.label} {...m} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-3 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-400"
      >
        {showAdvanced ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        Show advanced breakdown
      </button>
      {showAdvanced && (
        <div className="mt-2 space-y-1 rounded border border-neutral-700/80 bg-neutral-800/40 px-3 py-2 text-[11px] text-neutral-500">
          <p>Raw values: Field {identity.fieldAlignment} · Upside {identity.upsideVsField} · Risk {identity.riskProfile} · Anti-chalk {identity.antiChalkExposure} · Upset {identity.upsetDependency}</p>
          <p>Based on avg ownership, seed spread, and role composition at lock.</p>
        </div>
      )}
    </div>
  );
}

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
            const isHighLeverage = (lev?.leverage ?? 0) >= 2;
            return (
              <li
                key={`${pick.teamId}-${pick.role}`}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-shadow duration-200 ${ROLE_STYLES[pick.role]} ${
                  isHighLeverage ? "shadow-[0_0_12px_rgba(251,98,35,0.15)]" : ""
                }`}
              >
                <span className="font-medium">{name}</span>
                <span className="flex items-center gap-2 text-xs">
                  {lev ? (
                    <span
                      className={`tabular-nums ${isHighLeverage ? "font-semibold text-amber-300" : "text-amber-300/90"}`}
                      title="Leverage"
                    >
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

      {/* v2.3 Projection preview for active teams - v2.4 visual upgrade */}
      {analytics.projectionPreviews && analytics.projectionPreviews.length > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-300/90">
            <Target className="size-4" />
            Next-Round Projections
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {analytics.projectionPreviews.map((prev) => {
              const netSwing = prev.netSwing ?? 0;
              const netGain = netSwing > 0;
              const netLoss = netSwing < 0;
              const borderColor = netGain
                ? "border-emerald-500/30 hover:border-emerald-500/50"
                : netLoss
                  ? "border-red-500/20 hover:border-red-500/40"
                  : "border-neutral-700/60 hover:border-neutral-600";
              const netClass = netGain
                ? "text-emerald-400"
                : netLoss
                  ? "text-red-400"
                  : "text-neutral-400";
              return (
                <li
                  key={`${prev.teamId}-${prev.role}`}
                  className={`rounded-lg border bg-neutral-900/60 px-3 py-2.5 text-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${borderColor}`}
                >
                  <p className="font-medium text-neutral-100">
                    {prev.teamName} ({prev.role})
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    If {prev.role === "VILLAIN" ? "eliminated" : "wins"} next round → +{prev.youSwing} you / +{prev.leagueSwing} league / net{" "}
                    <span className={`font-medium ${netClass}`}>
                      {netSwing > 0 ? "+" : ""}{netSwing}
                    </span>
                  </p>
                </li>
              );
            })}
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
              <ChaosIndexCell value={analytics.pickLeverage.portfolioLeverage} label="Portfolio Leverage" />
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

      {/* Rivalry intel */}
      {data.rivalryPanel &&
        (data.rivalryPanel.closestRival ||
          data.rivalryPanel.strategicCollision ||
          data.rivalryPanel.directConflict ||
          data.rivalryPanel.biggestThreat ||
          data.rivalryPanel.mostOpposed) && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-300/90">
              <Swords className="size-4" />
              Rivalry Intel
            </h3>
            <ul className="space-y-2">
              {data.rivalryPanel.closestRival && (
                <li className="rounded-lg border border-violet-500/20 bg-neutral-900/60 px-3 py-2 text-sm">
                  <span className="font-medium text-violet-300">Closest Rival:</span>{" "}
                  {data.rivalryPanel.closestRival.detail}
                </li>
              )}
              {data.rivalryPanel.strategicCollision && (
                <li className="rounded-lg border border-violet-500/20 bg-neutral-900/60 px-3 py-2 text-sm">
                  <span className="font-medium text-violet-300">Strategic Collision:</span>{" "}
                  {data.rivalryPanel.strategicCollision.detail}
                </li>
              )}
              {data.rivalryPanel.directConflict && (
                <li className="rounded-lg border border-violet-500/20 bg-neutral-900/60 px-3 py-2 text-sm">
                  <span className="font-medium text-violet-300">Direct Conflict:</span>{" "}
                  {data.rivalryPanel.directConflict.detail}
                </li>
              )}
              {data.rivalryPanel.biggestThreat && (
                <li className="rounded-lg border border-violet-500/20 bg-neutral-900/60 px-3 py-2 text-sm">
                  <span className="font-medium text-violet-300">Biggest Threat:</span>{" "}
                  {data.rivalryPanel.biggestThreat.detail}
                </li>
              )}
              {data.rivalryPanel.mostOpposed && (
                <li className="rounded-lg border border-violet-500/20 bg-neutral-900/60 px-3 py-2 text-sm">
                  <span className="font-medium text-violet-300">Most Opposed:</span>{" "}
                  {data.rivalryPanel.mostOpposed.detail}
                </li>
              )}
            </ul>
          </div>
        )}

      {/* Portfolio Identity — locked to initial picks only */}
      {analytics.identity && (
        <PortfolioIdentityBlock identity={analytics.identity} />
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
