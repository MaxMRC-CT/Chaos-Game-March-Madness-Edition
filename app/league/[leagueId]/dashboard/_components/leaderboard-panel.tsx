"use client";

import { motion } from "framer-motion";

const LAYOUT_TRANSITION = { type: "tween" as const, duration: 0.22, ease: "easeOut" as const } as const;
import { Trophy } from "lucide-react";
import { WarRoomResponse } from "./types";

export function LeaderboardPanel({
  standings,
  me,
  aliveRolesByMemberId,
  standingsDelta,
  highlightEvents,
  ownershipMap,
  momentumSummaries,
  rankDelta,
  contrarianLabels,
}: {
  standings: WarRoomResponse["standings"];
  me: WarRoomResponse["me"];
  aliveRolesByMemberId: Record<string, Array<"HERO" | "VILLAIN" | "CINDERELLA">>;
  standingsDelta: WarRoomResponse["standingsDelta"];
  highlightEvents: WarRoomResponse["highlightEvents"];
  ownershipMap: WarRoomResponse["ownershipMap"];
  momentumSummaries?: WarRoomResponse["momentumSummaries"];
  rankDelta?: Record<string, number>;
  contrarianLabels?: Record<string, string>;
}) {
  const safeStandings = standings ?? [];
  const biggestJumpId = momentumSummaries?.biggestJump?.memberId ?? null;
  const clientBiggestJump =
    !biggestJumpId && rankDelta
      ? safeStandings
          .slice(0, 12)
          .reduce<{ memberId: string; delta: number } | null>(
            (best, r) => {
              const d = rankDelta[r.memberId] ?? 0;
              if (d <= 0) return best;
              return !best || d > best.delta ? { memberId: r.memberId, delta: d } : best;
            },
            null,
          )?.memberId ?? null
      : null;
  const topMoverIds = [...safeStandings]
    .sort((a, b) => Math.abs(standingsDelta[b.memberId] || 0) - Math.abs(standingsDelta[a.memberId] || 0))
    .slice(0, 3)
    .map((row) => row.memberId);

  return (
    <section
      id="power-rankings"
      className="rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-lg transition duration-200 sm:p-5 motion-reduce:transition-none supports-[hover:hover]:hover:shadow-xl"
    >
      <h2 className="mb-3 text-base font-semibold tracking-wide text-neutral-100 sm:text-lg">Power Rankings</h2>
      {safeStandings.length === 0 ? (
        <p className="text-sm text-neutral-400">Waiting for results</p>
      ) : (
        <motion.ul layout className="space-y-2">
          {safeStandings.slice(0, 12).map((row, index) => {
            const isMe = me?.memberId === row.memberId;
            const movement = standingsDelta[row.memberId] || 0;
            const rankChange = rankDelta?.[row.memberId] ?? 0;
            const aliveRoles = aliveRolesByMemberId[row.memberId] || [];
            const reason = topMoverIds.includes(row.memberId)
              ? movementReasonChip(row.memberId, highlightEvents, ownershipMap, momentumSummaries)
              : null;
            const isBiggestJump = biggestJumpId === row.memberId || clientBiggestJump === row.memberId;
            const isNewLeader = index === 0 && rankChange > 0;
            const showHighlight = isBiggestJump || isNewLeader;

            return (
              <motion.li
                key={row.memberId}
                layout
                transition={LAYOUT_TRANSITION}
                className={`rounded-lg border px-3 py-2 text-sm transition-shadow duration-300 ${
                  isMe ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-[#0f1623]/80"
                } ${showHighlight ? "standings-highlight-pulse" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-neutral-100">
                      <span className="font-mono text-xs text-neutral-400">#{index + 1}</span>
                      {rankChange !== 0 ? (
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold ${
                            rankChange > 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                          title={rankChange > 0 ? `Moved up ${rankChange}` : `Moved down ${-rankChange}`}
                        >
                          {rankChange > 0 ? "↑" : "↓"} {Math.abs(rankChange)}
                        </span>
                      ) : null}
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-semibold">
                        {(row.displayName || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <span>{row.displayName || "Unknown"}</span>
                      {contrarianLabels?.[row.memberId] ? (
                        <span
                          className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                          title={contrarianLabels[row.memberId]}
                        >
                          {contrarianLabels[row.memberId]}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-neutral-500" title="Championship tiebreak">
                        TB: {row.championshipPrediction != null ? row.championshipPrediction : "—"}
                      </span>
                      {index === 0 ? (
                        <span className="text-amber-400" title="Round leader" aria-hidden>
                          <Trophy className="size-3.5" />
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                      {aliveRoles.includes("HERO") ? (
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-200">H</span>
                      ) : null}
                      {aliveRoles.includes("VILLAIN") ? (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-200">V</span>
                      ) : null}
                      {aliveRoles.includes("CINDERELLA") ? (
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-200">C</span>
                      ) : null}
                      {aliveRoles.length === 0 ? <span>No alive teams</span> : null}
                    </p>
                    {reason ? (
                      <p className="mt-1 inline-flex rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                        {reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-neutral-100">{row.total ?? 0}</p>
                    <p className={`text-xs ${movement >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {movement >= 0 ? `+${movement}` : movement}
                    </p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}

function movementReasonChip(
  memberId: string,
  events: WarRoomResponse["highlightEvents"],
  ownershipMap: WarRoomResponse["ownershipMap"],
  momentumSummaries?: WarRoomResponse["momentumSummaries"],
) {
  if (momentumSummaries?.chaosSpike?.memberId === memberId) {
    return "Chaos Spike";
  }
  if (momentumSummaries?.biggestJump?.memberId === memberId && momentumSummaries.biggestJump.spots >= 2) {
    return `+${momentumSummaries.biggestJump.spots} spots`;
  }
  for (const event of events ?? []) {
    const payload = (event.payload || {}) as Record<string, unknown>;
    if (event.type === "RIVALRY_BONUS" && String(payload.memberId || "") === memberId) {
      const delta = Number(payload.delta || 0);
      const rule = String(payload.rule || "Rivalry").replace(/_/g, " ");
      return `${delta >= 0 ? "+" : ""}${delta} ${rule}`;
    }

    if (event.type === "TEAM_ELIMINATED") {
      const teamId = String(payload.teamId || "");
      const owners = ownershipMap[teamId] ?? [];
      const mine = owners.some((o) => o.ownerMemberId === memberId && o.role === "VILLAIN");
      if (mine) return "+ Villain elimination";
    }
  }

  return null;
}
