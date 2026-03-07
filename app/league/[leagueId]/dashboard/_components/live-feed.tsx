"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WarRoomResponse } from "./types";

type TabMode = "all" | "highlights";

type LiveFeedProps = {
  allEvents: WarRoomResponse["recentEvents"];
  highlightEvents: WarRoomResponse["highlightEvents"];
  picks: WarRoomResponse["picks"];
  members: WarRoomResponse["members"];
  teams: WarRoomResponse["teams"];
  expanded?: boolean;
  onExpand?: () => void;
  limit?: number;
  compact?: boolean;
  maxHeightClass?: string;
  showFilters?: boolean;
  title?: string;
  subtitle?: string;
  linkToFeed?: boolean;
  linkToFeedHref?: string;
};

export function LiveFeed({
  allEvents,
  highlightEvents,
  picks,
  members,
  teams,
  expanded = false,
  onExpand,
  limit,
  compact = false,
  maxHeightClass = "max-h-64",
  showFilters = true,
  title,
  subtitle,
  linkToFeed = false,
  linkToFeedHref = "?view=feed",
}: LiveFeedProps) {
  const [mode, setMode] = useState<TabMode>("all");

  const events = mode === "highlights" ? highlightEvents : allEvents;
  const visibleEvents = limit ? events.slice(0, limit) : events;

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

  const headingText = title ?? (compact ? "Recent Activity" : "Live Feed");
  const itemClassesCompact =
    "rounded-lg border border-white/10 bg-[#0f1623]/70 px-2.5 py-1.5 text-xs transition hover:bg-[#0f1623]/85";
  const itemClassesDefault = "rounded-lg border px-3 py-2 text-sm";
  const sectionClasses =
    "rounded-2xl border border-white/10 bg-[#111827]/95 backdrop-blur-sm p-4 sm:p-5 shadow-[0_0_18px_rgba(251,98,35,0.06)] transition duration-200 motion-reduce:transition-none motion-reduce:transform-none supports-[hover:hover]:hover:-translate-y-1 supports-[hover:hover]:hover:shadow-[0_0_28px_rgba(251,98,35,0.14)]";
  const headingClass = "text-base font-semibold tracking-wide text-neutral-100 sm:text-lg";

  return (
    <section className={sectionClasses}>
      <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
        <div>
          <h2 className={headingClass}>
            {headingText}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] text-neutral-400">{subtitle}</p>
          ) : null}
        </div>
        {showFilters ? (
          <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900/80 p-0.5 text-xs" role="tablist" aria-label="Feed filter">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "all"}
              className={`rounded-md px-2.5 py-1.5 font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${mode === "all" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
              onClick={() => setMode("all")}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "highlights"}
              className={`rounded-md px-2.5 py-1.5 font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                mode === "highlights" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
              onClick={() => setMode("highlights")}
            >
              Highlights
            </button>
          </div>
        ) : null}
      </div>

      {visibleEvents.length === 0 ? (
        <p className="text-sm text-neutral-400">No events yet</p>
      ) : compact ? (
        <div className={`overflow-y-auto pr-1 ${maxHeightClass}`}>
          <ul className="space-y-1.5">
            {visibleEvents.map((event) => {
              const story = formatEventStory(event, { memberById, teamById, pickByTeamId }, { compact: true });
              return (
                <li
                  key={event.id}
                  className={`min-w-0 ${itemClassesCompact}`}
                >
                  <p className="truncate text-neutral-100">{story.label}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
                    {story.roleBadge ? (
                      <span className={`rounded-full border border-white/10 px-1.5 py-0.5 ${story.roleBadge.className}`}>
                        {story.roleBadge.label}
                      </span>
                    ) : null}
                    {story.deltaText ? <span>{story.deltaText}</span> : null}
                    <span className="shrink-0 text-neutral-500">
                      {new Date(event.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleEvents.map((event) => {
            const story = formatEventStory(event, { memberById, teamById, pickByTeamId });
            return (
              <li
                key={event.id}
                className={`min-w-0 ${itemClassesDefault} ${eventClassName(event)}`}
              >
                <p className="truncate text-neutral-100">{story.label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
                  {story.roleBadge ? (
                    <span className={`rounded-full border border-white/10 px-1.5 py-0.5 ${story.roleBadge.className}`}>
                      {story.roleBadge.label}
                    </span>
                  ) : null}
                  {story.deltaText ? <span>{story.deltaText}</span> : null}
                  <span className="shrink-0 text-neutral-500">
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {linkToFeed ? (
        <div className="mt-3">
          <Link
            href={linkToFeedHref}
            className="text-xs text-neutral-300 underline hover:text-white"
          >
            View all
          </Link>
        </div>
      ) : !expanded && onExpand && limit ? (
        <div className="mt-3">
          <Link
            href={linkToFeedHref}
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
  options?: { compact?: boolean },
) {
  const compact = options?.compact ?? false;
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
