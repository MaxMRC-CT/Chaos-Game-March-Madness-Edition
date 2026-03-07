/**
 * v2.2 Phase 1C: Event storytelling with momentum labels.
 * Shared logic for LiveFeed and EventTimeline.
 */

import { getEventMomentumLabel } from "./momentum";

export type EventContext = {
  memberById: Record<string, string>;
  teamById: Record<string, string>;
  pickByTeamId: Record<string, { role: string }>;
  ownershipByRole?: Record<string, { heroPct: number; villainPct: number; cinderellaPct: number }>;
};

export type FormattedStory = {
  label: string;
  momentumLabel: string | null;
  roleBadge: { label: string; className: string } | null;
  deltaText: string | null;
};

export function roleBadge(role: string) {
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

export function formatEventStory(
  event: { type: string; payload: unknown },
  context: EventContext,
  options?: { compact?: boolean },
): FormattedStory {
  const compact = options?.compact ?? false;
  const payload = (event.payload || {}) as Record<string, unknown>;
  const momentumLabel = context.ownershipByRole
    ? getEventMomentumLabel(event.type, payload, context.ownershipByRole)
    : null;

  if (event.type === "DRAFT_PICK_MADE") {
    const memberId = String(payload.memberId || "");
    const teamId = String(payload.teamId || "");
    const role = String(payload.role || "");
    return {
      label: `${context.memberById[memberId] || "Manager"} drafted ${context.teamById[teamId] || "a team"} (${role})`,
      momentumLabel: null,
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
      const base = compact
        ? `Villain: ${teamName} out +${villainCash}`
        : `Villain hit: ${teamName} eliminated — +${villainCash} pts`;
      return {
        label: momentumLabel ? `${momentumLabel}: ${base}` : base,
        momentumLabel,
        roleBadge: pick?.role ? roleBadge(pick.role) : null,
        deltaText: `+${villainCash}`,
      };
    }
    return {
      label: momentumLabel ? `${momentumLabel}: ${teamName} eliminated` : `${teamName} eliminated`,
      momentumLabel,
      roleBadge: pick?.role ? roleBadge(pick.role) : null,
      deltaText: null,
    };
  }

  if (event.type === "RIVALRY_BONUS") {
    const memberId = String(payload.memberId || "");
    const delta = Number(payload.delta || 0);
    const rule = String(payload.rule || "RIVALRY");
    const memberName = context.memberById[memberId] || "Manager";

    let base: string;
    if (rule === "HERO_OVER_VILLAIN") {
      base = `Hero advance: ${memberName}'s Hero beats Villain`;
    } else if (rule === "CINDERELLA_OVER_HERO") {
      base = `Cinderella upset: ${memberName}'s Cinderella knocks out Hero`;
    } else if (rule === "VILLAIN_OVER_HERO") {
      base = `Villain strike: ${memberName} loses Hero`;
    } else {
      base = `Rivalry: ${memberName} ${delta > 0 ? "+" : ""}${delta} (${rule.replace(/_/g, " ")})`;
    }
    return {
      label: momentumLabel ? `${momentumLabel}: ${base}` : base,
      momentumLabel,
      roleBadge:
        rule === "HERO_OVER_VILLAIN"
          ? roleBadge("HERO")
          : rule === "CINDERELLA_OVER_HERO"
            ? roleBadge("CINDERELLA")
            : rule === "VILLAIN_OVER_HERO"
              ? roleBadge("VILLAIN")
              : null,
      deltaText: `${delta > 0 ? "+" : ""}${delta}`,
    };
  }

  if (event.type === "SCORE_RECALCULATED") {
    return {
      label: "Milestone update: scores recalculated",
      momentumLabel: null,
      roleBadge: null,
      deltaText: null,
    };
  }

  return {
    label: event.type.toLowerCase().replace(/_/g, " "),
    momentumLabel: null,
    roleBadge: null,
    deltaText: null,
  };
}

export function eventClassName(
  event: { type: string; payload: unknown },
  momentumLabel: string | null,
): string {
  const payload = (event.payload || {}) as Record<string, unknown>;
  if (event.type === "RIVALRY_BONUS") {
    const rule = String(payload.rule ?? "");
    if (rule === "HERO_OVER_VILLAIN") return "border-blue-500/40 bg-blue-500/10";
    if (rule === "CINDERELLA_OVER_HERO") return "border-violet-500/40 bg-violet-500/10";
    if (rule === "VILLAIN_OVER_HERO") return "border-red-500/40 bg-red-500/10";
    return "border-violet-500/40 bg-violet-500/10";
  }
  if (event.type === "TEAM_ELIMINATED") {
    if (momentumLabel === "Chalk Collapse") return "border-amber-500/40 bg-amber-500/10";
    if (momentumLabel === "Villain Shockwave") return "border-red-500/40 bg-red-500/10";
    return "border-red-500/40 bg-red-500/10";
  }
  if (event.type === "SCORE_RECALCULATED") return "border-neutral-700 bg-neutral-950/50";
  if (event.type === "DRAFT_PICK_MADE") return "border-blue-500/40 bg-blue-500/10";
  return "border-neutral-800 bg-neutral-950/50";
}
