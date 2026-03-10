"use client";

import { Swords } from "lucide-react";
import { WarRoomResponse } from "./types";

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
  return `${member?.displayName || "Unknown"} ${delta >= 0 ? "+" : ""}${delta} • ${winnerTeam?.shortName || winnerTeam?.name || "Team"} over ${loserTeam?.shortName || loserTeam?.name || "Team"}`;
}

export function RivalryHighlightsCard({
  events,
  data,
}: {
  events: WarRoomResponse["highlightEvents"];
  data: WarRoomResponse;
}) {
  const rivalryOnly = events.filter((e) => e.type === "RIVALRY_BONUS").slice(0, 5);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/95 p-3 shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <Swords className="size-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-neutral-100">Rivalry Highlights</h2>
      </div>
      {rivalryOnly.length === 0 ? (
        <p className="text-xs text-neutral-500">No rivalry swings yet</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {rivalryOnly.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-violet-500/30 bg-violet-950/20 px-2.5 py-1.5 text-xs text-neutral-100"
            >
              {formatRivalryMoment(event, data)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
