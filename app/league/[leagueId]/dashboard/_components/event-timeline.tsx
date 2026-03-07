"use client";

import { useMemo, useState } from "react";
import { WarRoomResponse } from "./types";

const EVENT_TYPES = ["all", "draft", "rivalry", "elimination", "score"] as const;
type EventTypeFilter = (typeof EVENT_TYPES)[number];

type EventItem = WarRoomResponse["recentEvents"][number];

function formatEventStory(
  event: EventItem,
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
      label: `${context.memberById[memberId] || "Manager"} drafted ${context.teamById[teamId] || "a team"} (${role})`,
      roleBadge: roleBadge(role),
      deltaText: null,
    };
  }

  if (event.type === "TEAM_ELIMINATED") {
    const teamId = String(payload.teamId || "");
    const eliminatedRound = String(payload.eliminatedRound || "");
    const pick = context.pickByTeamId[teamId];
    const villainCash = pick?.role === "VILLAIN" ? villainCashForRound(eliminatedRound) : 0;
    const teamName = context.teamById[teamId] || "A team";

    if (villainCash > 0) {
      return {
        label: `Villain hit: ${teamName} eliminated — +${villainCash} pts`,
        roleBadge: pick?.role ? roleBadge(pick.role) : null,
        deltaText: `+${villainCash}`,
      };
    }
    return {
      label: `${teamName} eliminated`,
      roleBadge: pick?.role ? roleBadge(pick.role) : null,
      deltaText: null,
    };
  }

  if (event.type === "RIVALRY_BONUS") {
    const memberId = String(payload.memberId || "");
    const delta = Number(payload.delta || 0);
    const rule = String(payload.rule || "RIVALRY");
    const memberName = context.memberById[memberId] || "Manager";

    if (rule === "HERO_OVER_VILLAIN") {
      return {
        label: `Hero advance: ${memberName}'s Hero beats Villain`,
        roleBadge: roleBadge("HERO"),
        deltaText: `+${delta}`,
      };
    }
    if (rule === "CINDERELLA_OVER_HERO") {
      return {
        label: `Cinderella upset: ${memberName}'s Cinderella knocks out Hero`,
        roleBadge: roleBadge("CINDERELLA"),
        deltaText: `+${delta}`,
      };
    }
    if (rule === "VILLAIN_OVER_HERO") {
      return {
        label: `Villain strike: ${memberName} loses Hero`,
        roleBadge: roleBadge("VILLAIN"),
        deltaText: `${delta}`,
      };
    }
    return {
      label: `Rivalry: ${memberName} ${delta > 0 ? "+" : ""}${delta} (${rule.replace(/_/g, " ")})`,
      roleBadge: null,
      deltaText: `${delta > 0 ? "+" : ""}${delta}`,
    };
  }

  if (event.type === "SCORE_RECALCULATED") {
    return {
      label: "Milestone update: scores recalculated",
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

function eventClassName(event: EventItem) {
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

function getTimeBucket(dateStr: string): "today" | "yesterday" | "older" {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (eventDate.getTime() === today.getTime()) return "today";
  if (eventDate.getTime() === yesterday.getTime()) return "yesterday";
  return "older";
}

function matchesTypeFilter(event: EventItem, filter: EventTypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "draft" && event.type === "DRAFT_PICK_MADE") return true;
  if (filter === "rivalry" && event.type === "RIVALRY_BONUS") return true;
  if (filter === "elimination" && event.type === "TEAM_ELIMINATED") return true;
  if (filter === "score" && event.type === "SCORE_RECALCULATED") return true;
  return false;
}

export function EventTimeline({
  events,
  picks,
  members,
  teams,
}: {
  events: WarRoomResponse["recentEvents"];
  picks: WarRoomResponse["picks"];
  members: WarRoomResponse["members"];
  teams: WarRoomResponse["teams"];
}) {
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("all");
  const [search, setSearch] = useState("");

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

  const { filtered, byBucket } = useMemo(() => {
    const filtered = events.filter(
      (e) => matchesTypeFilter(e, typeFilter) && (!search || formatEventStory(e, { memberById, teamById, pickByTeamId }).label.toLowerCase().includes(search.toLowerCase())),
    );
    const byBucket: Record<"today" | "yesterday" | "older", EventItem[]> = {
      today: [],
      yesterday: [],
      older: [],
    };
    for (const e of filtered) {
      byBucket[getTimeBucket(e.createdAt)].push(e);
    }
    return { filtered, byBucket };
  }, [events, typeFilter, search, memberById, teamById, pickByTeamId]);

  const bucketLabels: Record<"today" | "yesterday" | "older", string> = {
    today: "Today",
    yesterday: "Yesterday",
    older: "Older",
  };

  return (
    <section
      id="feed"
      className="rounded-xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-lg"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-100">Event Timeline</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Full audit log of league events. Filter by type and time.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search events"
          className="rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
        />
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 p-1 text-xs" role="tablist" aria-label="Event type filter">
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={typeFilter === type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-lg px-2.5 py-1.5 font-medium capitalize outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                typeFilter === type ? "bg-neutral-700 text-white" : "text-neutral-400 hover:bg-neutral-700/60 hover:text-neutral-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">No events match your filters</p>
      ) : (
        <div className="space-y-6">
          {(["today", "yesterday", "older"] as const).map(
            (bucket) =>
              byBucket[bucket].length > 0 && (
                <div key={bucket}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {bucketLabels[bucket]}
                  </h3>
                  <ul className="space-y-2">
                    {byBucket[bucket].map((event) => {
                      const story = formatEventStory(event, {
                        memberById,
                        teamById,
                        pickByTeamId,
                      });
                      return (
                        <li
                          key={event.id}
                          className={`rounded-lg border px-3 py-2 text-sm ${eventClassName(event)}`}
                        >
                          <p className="text-neutral-100">{story.label}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                            {story.roleBadge ? (
                              <span
                                className={`rounded px-1.5 py-0.5 ${story.roleBadge.className}`}
                              >
                                {story.roleBadge.label}
                              </span>
                            ) : null}
                            {story.deltaText ? <span>{story.deltaText}</span> : null}
                            <span>
                              {new Date(event.createdAt).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
          )}
        </div>
      )}
    </section>
  );
}
