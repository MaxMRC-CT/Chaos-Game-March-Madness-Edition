/**
 * Shared War Room payload normalizer.
 * Ensures all array and object fields exist to prevent "Cannot read properties of undefined (reading 'length')" crashes.
 * Use at every boundary: fetch responses, initial props, before passing to child components.
 */

import type { WarRoomResponse } from "@/app/league/[leagueId]/dashboard/_components/types";

export function normalizeWarRoomPayload(
  payload: WarRoomResponse | Record<string, unknown> | null | undefined,
): WarRoomResponse {
  if (payload == null || typeof payload !== "object") {
    return getEmptyWarRoomShape();
  }
  const p = payload as Record<string, unknown>;
  return {
    ...p,
    games: Array.isArray(p.games) ? p.games : [],
    standings: Array.isArray(p.standings) ? p.standings : [],
    picks: Array.isArray(p.picks) ? p.picks : [],
    highlightEvents: Array.isArray(p.highlightEvents) ? p.highlightEvents : [],
    hotSeatMatchups: Array.isArray(p.hotSeatMatchups) ? p.hotSeatMatchups : [],
    teamResults: Array.isArray(p.teamResults) ? p.teamResults : [],
    recentEvents: Array.isArray(p.recentEvents) ? p.recentEvents : [],
    members: Array.isArray(p.members) ? p.members : [],
    teams: Array.isArray(p.teams) ? p.teams : [],
    myPicks: Array.isArray(p.myPicks) ? p.myPicks : [],
    standingsDelta:
      typeof p.standingsDelta === "object" && p.standingsDelta !== null && !Array.isArray(p.standingsDelta)
        ? p.standingsDelta
        : {},
    ownershipMap:
      typeof p.ownershipMap === "object" && p.ownershipMap !== null && !Array.isArray(p.ownershipMap)
        ? p.ownershipMap
        : {},
    ownershipByRole:
      typeof p.ownershipByRole === "object" && p.ownershipByRole !== null && !Array.isArray(p.ownershipByRole)
        ? p.ownershipByRole
        : {},
  } as WarRoomResponse;
}

/** Returns true if the payload is an API error (e.g. { error: "..." }) — do not treat as WarRoomResponse. */
export function isWarRoomErrorPayload(
  payload: unknown,
): payload is { error: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  );
}

function getEmptyWarRoomShape(): WarRoomResponse {
  return {
    league: {
      id: "",
      name: "",
      status: "SETUP",
      code: "",
      currentPick: 0,
      currentRound: "R64",
    },
    me: null,
    members: [],
    picks: [],
    myPicks: [],
    teams: [],
    teamResults: [],
    games: [],
    standings: [],
    standingsDelta: {},
    standingsUpdatedAt: null,
    recentEvents: [],
    highlightEvents: [],
    hotSeatMatchups: [],
    ownershipMap: {},
    ownershipByRole: {},
  } as WarRoomResponse;
}
