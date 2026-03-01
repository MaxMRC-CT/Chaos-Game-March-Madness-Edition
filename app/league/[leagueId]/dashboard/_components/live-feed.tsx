"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WarRoomResponse } from "./types";

type TabMode = "all" | "highlights";

export function LiveFeed({
  allEvents,
  highlightEvents,
  picks,
  members,
  teams,
  expanded,
  onExpand,
}: {
  allEvents: WarRoomResponse["recentEvents"];
  highlightEvents: WarRoomResponse["highlightEvents"];
  picks: WarRoomResponse["picks"];
  members: WarRoomResponse["members"];
  teams: WarRoomResponse["teams"];
  expanded: boolean;
  onExpand: () => void;
}) {
  const [mode, setMode] = useState<TabMode>("all");

  const events = mode === "highlights" ? highlightEvents : allEvents;
  const visibleEvents = events.slice(0, expanded ? 30 : 15);

  const memberById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) map[member.id] = member.displayName;
    return map;
  }, [members]);

  const teamById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const team of teams) map[team.id] = team.shortName || team.name;
    return map;
  }, [teams]);

  const pickByTeamId = useMemo(() => {
    const map: Record<string, WarRoomResponse["picks"][number]> = {};
    for (const pick of picks) map[pick.teamId] = pick;
    return map;
  }, [picks]);

  return (
    <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">LIVE FEED</h2>
        <div className="inline-flex rounded-lg border border-[#1f2937] bg-[#0f1623] p-0.5 text-xs">
          <button
            type="button"
            className={`rounded px-2 py-1 ${mode === "all" ? "bg-neutral-700 text-white" : "text-neutral-300"}`}
            onClick={() => setMode("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${
              mode === "highlights" ? "bg-neutral-700 text-white" : "text-neutral-300"
            }`}
            onClick={() => setMode("highlights")}
          >
            Highlights
          </button>
        </div>
      </div>

      {visibleEvents.length === 0 ? (
        <p className="text-sm text-neutral-400">No events yet</p>
      ) : (
        <ul className="space-y-2">
          {visibleEvents.map((event) => {
            const story = formatEventStory(event, { memberById, teamById, pickByTeamId });
            return (
              <li
                key={event.id}
                className={`rounded-lg border px-3 py-2 text-sm ${eventClassName(event)}`}
              >
                <p className="text-neutral-100">{story.label}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                  {story.roleBadge ? (
                    <span className={`rounded px-1.5 py-0.5 ${story.roleBadge.className}`}>
                      {story.roleBadge.label}
                    </span>
                  ) : null}
                  {story.deltaText ? <span>{story.deltaText}</span> : null}
                  <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!expanded ? (
        <div className="mt-3">
          <Link
            href="#feed"
            onClick={onExpand}
            className="text-xs text-neutral-300 underline hover:text-white"
          >
            View all
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function formatEventStory(
  event: WarRoomResponse["recentEvents"][number],
  context: {
    memberById: Record<string, string>;
    teamById: Record<string, string>;
    pickByTeamId: Record<string, WarRoomResponse["picks"][number]>;
  },
) {
  const payload = (event.payload || {}) as Record<string, unknown>;

  if (event.type === "DRAFT_PICK_MADE") {
    const memberId = String(payload.memberId || "");
    const teamId = String(payload.teamId || "");
    const role = String(payload.role || "");
    return {
      label: `📝 ${context.memberById[memberId] || "Manager"} drafted ${context.teamById[teamId] || "a team"} (${role})`,
      roleBadge: roleBadge(role),
      deltaText: null,
    };
  }

  if (event.type === "TEAM_ELIMINATED") {
    const teamId = String(payload.teamId || "");
    const eliminatedRound = String(payload.eliminatedRound || "");
    const pick = context.pickByTeamId[teamId];
    const villainCash = pick?.role === "VILLAIN" ? villainCashForRound(eliminatedRound) : 0;

    return {
      label: `💀 ${context.teamById[teamId] || "A team"} is out${villainCash > 0 ? ` — Villain owners cash +${villainCash}` : ""}`,
      roleBadge: pick?.role ? roleBadge(pick.role) : null,
      deltaText: villainCash > 0 ? `+${villainCash}` : null,
    };
  }

  if (event.type === "RIVALRY_BONUS") {
    const memberId = String(payload.memberId || "");
    const delta = Number(payload.delta || 0);
    const rule = String(payload.rule || "RIVALRY").replace(/_/g, " ");
    return {
      label: `⚔ Rivalry swing: ${context.memberById[memberId] || "Manager"} ${delta > 0 ? "+" : ""}${delta} (${rule})`,
      roleBadge: null,
      deltaText: `${delta > 0 ? "+" : ""}${delta}`,
    };
  }

  if (event.type === "SCORE_RECALCULATED") {
    return {
      label: "📈 Scores updated",
      roleBadge: null,
      deltaText: null,
    };
  }

  return {
    label: event.type.toLowerCase().replace(/_/g, " "),
    roleBadge: null,
    deltaText: null,
  };
}

function roleBadge(role: string) {
  if (role === "HERO") return { label: "H", className: "bg-blue-500/20 text-blue-200" };
  if (role === "VILLAIN") return { label: "V", className: "bg-red-500/20 text-red-200" };
  if (role === "CINDERELLA") return { label: "C", className: "bg-violet-500/20 text-violet-200" };
  return null;
}

function villainCashForRound(round: string) {
  if (round === "R64") return 15;
  if (round === "R32") return 10;
  if (round === "S16") return 7;
  if (round === "E8") return 4;
  if (round === "F4") return 2;
  return 0;
}

function eventClassName(event: WarRoomResponse["recentEvents"][number]) {
  const payload = (event.payload || {}) as Record<string, unknown>;
  if (event.type === "RIVALRY_BONUS") {
    const rule = String(payload.rule ?? "");
    if (rule === "HERO_OVER_VILLAIN") return "border-blue-500/40 bg-blue-500/10";
    if (rule === "CINDERELLA_OVER_HERO") return "border-violet-500/40 bg-violet-500/10";
    if (rule === "VILLAIN_OVER_HERO") return "border-red-500/40 bg-red-500/10";
    return "border-violet-500/40 bg-violet-500/10";
  }
  if (event.type === "TEAM_ELIMINATED") return "border-red-500/40 bg-red-500/10";
  if (event.type === "SCORE_RECALCULATED") return "border-neutral-700 bg-neutral-950/50";
  if (event.type === "DRAFT_PICK_MADE") return "border-blue-500/40 bg-blue-500/10";
  return "border-neutral-800 bg-neutral-950/50";
}
