"use client";

import { Swords, Target, TrendingUp, Users, Zap } from "lucide-react";
import { WarRoomResponse, RivalryInsight } from "./types";

function RivalryInsightCard({
  insight,
  contrarianLabel,
}: {
  insight: RivalryInsight;
  contrarianLabel?: string | null;
}) {
  const icon =
    insight.type === "closest_rival"
      ? Target
      : insight.type === "strategic_collision"
        ? Users
        : insight.type === "direct_conflict"
          ? Swords
          : insight.type === "biggest_threat"
            ? Zap
            : Target;
  const Icon = icon;
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4 transition hover:border-violet-500/40">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-violet-400" />
        <span className="text-xs font-medium uppercase tracking-wider text-violet-300/90">
          {insight.label}
        </span>
        {contrarianLabel ? (
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            {contrarianLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-neutral-100">{insight.displayName || "Unknown"}</p>
      <p className="mt-0.5 text-sm text-neutral-400">{insight.detail}</p>
    </div>
  );
}

function formatRivalryMoment(
  event: WarRoomResponse["highlightEvents"][number],
  data: WarRoomResponse,
) {
  const payload = (event.payload || {}) as Record<string, unknown>;
  const winnerTeamId = String(payload.winnerTeamId || "");
  const loserTeamId = String(payload.loserTeamId || "");
  const delta = Number(payload.delta || 0);
  const winnerTeam = data.teams.find((t) => t.id === winnerTeamId);
  const loserTeam = data.teams.find((t) => t.id === loserTeamId);
  const member = data.members.find((m) => m.id === String(payload.memberId || ""));
  return {
    member: member?.displayName || "Unknown",
    delta,
    winner: winnerTeam?.shortName || winnerTeam?.name || "Team",
    loser: loserTeam?.shortName || loserTeam?.name || "Team",
    rule: String(payload.rule || "RIVALRY").replace(/_/g, " "),
  };
}

export function RivalriesView({
  data,
  rivalryMoments,
}: {
  data: WarRoomResponse;
  rivalryMoments: WarRoomResponse["highlightEvents"];
}) {
  const topSwings = rivalryMoments.slice(0, 3).map((e) => formatRivalryMoment(e, data));
  const panel = data.rivalryPanel;
  const contrarianLabels = data.contrarianLabels ?? {};
  const insights = panel
    ? [
        panel.closestRival,
        panel.strategicCollision,
        panel.directConflict,
        panel.biggestThreat,
        panel.mostOpposed,
      ].filter((i): i is RivalryInsight => i != null)
    : [];

  return (
    <div id="rivalries" className="space-y-4">
      {insights.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-violet-950/30 via-neutral-900/95 to-neutral-950/95 p-6 backdrop-blur shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <Target className="size-5 text-violet-400" />
            <h2 className="text-lg font-semibold tracking-tight text-neutral-100">
              Strategic Intel
            </h2>
          </div>
          <p className="mb-4 text-sm text-neutral-400">
            Key rivalries and collision points in your league.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight) => (
              <RivalryInsightCard
                key={insight.type}
                insight={insight}
                contrarianLabel={contrarianLabels[insight.memberId]}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-violet-950/40 via-neutral-900/95 to-neutral-950/95 p-6 backdrop-blur shadow-xl">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="size-6 text-violet-400" />
          <h2 className="text-xl font-semibold tracking-tight text-neutral-100">
            Head-to-Head Battles
          </h2>
        </div>
        <p className="text-sm text-neutral-400">
          Rivalry rules create point swings when your teams face off. Hero over Villain, Cinderella
          over Hero — every matchup matters.
        </p>
        {rivalryMoments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-[#1f2937] bg-[#0f1623]/60 p-6 text-center">
            <p className="text-sm text-neutral-500">No rivalry swings yet.</p>
            <p className="mt-1 text-xs text-neutral-500">
              Swings appear when owned teams meet in tournament games
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topSwings.map((swing, i) => (
              <div
                key={rivalryMoments[i]?.id ?? i}
                className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4 transition hover:border-violet-500/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-100">{swing.member}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      swing.delta >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {swing.delta >= 0 ? "+" : ""}{swing.delta}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {swing.winner} over {swing.loser}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-violet-400/80">
                  {swing.rule}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 p-6 backdrop-blur shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-neutral-100">Momentum Leaders</h2>
        </div>
        <p className="text-sm text-neutral-400">
          Managers with the biggest rivalry swings so far — powered by head-to-head matchups.
        </p>
        <div className="mt-4 rounded-xl border border-[#1f2937] bg-[#0f1623]/60 p-4">
          {rivalryMoments.length === 0 ? (
            <p className="text-sm text-neutral-500">No momentum data yet</p>
          ) : (
            <ul className="space-y-2">
              {[...rivalryMoments]
                .sort((a, b) => {
                  const da = Number((a.payload as Record<string, unknown>)?.delta || 0);
                  const db = Number((b.payload as Record<string, unknown>)?.delta || 0);
                  return Math.abs(db) - Math.abs(da);
                })
                .slice(0, 5)
                .map((event) => {
                  const s = formatRivalryMoment(event, data);
                  return (
                    <li
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm"
                    >
                      <span className="text-neutral-100">{s.member}</span>
                      <span
                        className={
                          s.delta >= 0 ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {s.delta >= 0 ? "+" : ""}{s.delta}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
