"use client";

import { WarRoomResponse } from "./types";

export function LeaderboardPanel({
  standings,
  me,
  aliveRolesByMemberId,
  standingsDelta,
  highlightEvents,
  ownershipMap,
}: {
  standings: WarRoomResponse["standings"];
  me: WarRoomResponse["me"];
  aliveRolesByMemberId: Record<string, Array<"HERO" | "VILLAIN" | "CINDERELLA">>;
  standingsDelta: WarRoomResponse["standingsDelta"];
  highlightEvents: WarRoomResponse["highlightEvents"];
  ownershipMap: WarRoomResponse["ownershipMap"];
}) {
  const topMoverIds = [...standings]
    .sort((a, b) => Math.abs(standingsDelta[b.memberId] || 0) - Math.abs(standingsDelta[a.memberId] || 0))
    .slice(0, 3)
    .map((row) => row.memberId);

  return (
    <section
      id="power-rankings"
      className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]"
    >
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">POWER RANKINGS</h2>
      {standings.length === 0 ? (
        <p className="text-sm text-neutral-400">Waiting for results</p>
      ) : (
        <ul className="space-y-2">
          {standings.slice(0, 12).map((row, index) => {
            const isMe = me?.memberId === row.memberId;
            const movement = standingsDelta[row.memberId] || 0;
            const aliveRoles = aliveRolesByMemberId[row.memberId] || [];
            const reason = topMoverIds.includes(row.memberId)
              ? movementReasonChip(row.memberId, highlightEvents, ownershipMap)
              : null;

            return (
              <li
                key={row.memberId}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  isMe ? "border-emerald-500/30 bg-emerald-500/10" : "border-[#1f2937] bg-[#0f1623]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-neutral-100">
                      <span className="font-mono text-xs text-neutral-400">#{index + 1}</span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-semibold">
                        {row.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <span>{row.displayName}</span>
                      {index === 0 ? <span title="Round leader">🔥</span> : null}
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function movementReasonChip(
  memberId: string,
  events: WarRoomResponse["highlightEvents"],
  ownershipMap: WarRoomResponse["ownershipMap"],
) {
  for (const event of events) {
    const payload = (event.payload || {}) as Record<string, unknown>;
    if (event.type === "RIVALRY_BONUS" && String(payload.memberId || "") === memberId) {
      const delta = Number(payload.delta || 0);
      const rule = String(payload.rule || "Rivalry").replace(/_/g, " ");
      return `${delta >= 0 ? "+" : ""}${delta} ${rule}`;
    }

    if (event.type === "TEAM_ELIMINATED") {
      const teamId = String(payload.teamId || "");
      const owner = ownershipMap[teamId];
      if (!owner || owner.ownerMemberId !== memberId) continue;
      if (owner.role === "VILLAIN") {
        return "+ Villain elimination";
      }
    }
  }

  return null;
}
