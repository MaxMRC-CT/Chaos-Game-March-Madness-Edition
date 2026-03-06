/**
 * Chaos v2 hybrid lifecycle helpers.
 * Determines roster completion, lock/live timing, and status transitions.
 */

import { prisma } from "@/lib/db";

const PICKS_PER_MEMBER = 6;
const DEFAULT_LIVE_THRESHOLD_MINUTES = 60;

export type LeagueStatus = "SETUP" | "LOCKED" | "DRAFT" | "LIVE" | "COMPLETE";

type LeagueRow = {
  id: string;
  status: string;
  lockDeadline: Date | null;
  firstTipOff: Date | null;
};

/** Returns true if every member has exactly 6 valid portfolio picks (2/2/2) and a championship tiebreaker. */
export async function allRostersComplete(leagueId: string): Promise<boolean> {
  const memberCount = await prisma.leagueMember.count({ where: { leagueId } });
  if (memberCount === 0) return false;

  const expectedPicks = memberCount * PICKS_PER_MEMBER;
  const actualPicks = await prisma.portfolioPick.count({ where: { leagueId } });
  if (actualPicks < expectedPicks) return false;

  const membersWithoutTiebreaker = await prisma.leagueMember.count({
    where: {
      leagueId,
      championshipPrediction: null,
    },
  });
  return membersWithoutTiebreaker === 0;
}

/** Returns true if lock deadline has passed (when set). */
function lockDeadlinePassed(league: LeagueRow): boolean {
  if (!league.lockDeadline) return false;
  return new Date() >= league.lockDeadline;
}

/** Returns true if live threshold has passed. Default: 60 min before first tip-off. */
function liveThresholdPassed(league: LeagueRow): boolean {
  if (!league.firstTipOff) return false;
  const threshold = new Date(league.firstTipOff.getTime() - DEFAULT_LIVE_THRESHOLD_MINUTES * 60 * 1000);
  return new Date() >= threshold;
}

/** Whether league should transition SETUP -> LOCKED. */
export async function shouldLock(league: LeagueRow): Promise<boolean> {
  if (league.status !== "SETUP") return false;
  const rostersComplete = await allRostersComplete(league.id);
  return rostersComplete || lockDeadlinePassed(league);
}

/** Whether league should transition LOCKED -> LIVE (or SETUP -> LIVE if no LOCKED in path). */
export async function shouldGoLive(league: LeagueRow): Promise<boolean> {
  if (league.status === "LIVE" || league.status === "COMPLETE") return false;
  if (league.status === "SETUP") {
    const rostersComplete = await allRostersComplete(league.id);
    if (!rostersComplete && !lockDeadlinePassed(league)) return false;
  }
  return liveThresholdPassed(league);
}

/** Evaluate and apply status transitions. Call on relevant page/API loads. */
export async function evaluateStatusTransitions(leagueId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, status: true, lockDeadline: true, firstTipOff: true },
  });
  if (!league) return;

  const row: LeagueRow = league;

  if (league.status === "SETUP") {
    if (await shouldLock(row)) {
      await prisma.league.update({
        where: { id: leagueId },
        data: { status: "LOCKED" },
      });
    }
  }

  const refreshed = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, status: true, lockDeadline: true, firstTipOff: true },
  });
  if (!refreshed) return;

  const refreshedRow: LeagueRow = refreshed;
  if ((refreshed.status === "SETUP" || refreshed.status === "LOCKED") && (await shouldGoLive(refreshedRow))) {
    await prisma.league.update({
      where: { id: leagueId },
      data: { status: "LIVE" },
    });
  }
}

/** Get lock deadline display (Eastern) for UI. */
export function formatLockDeadline(lockDeadline: Date | null): string | null {
  if (!lockDeadline) return null;
  return lockDeadline.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" });
}

/** Get live threshold display for UI. */
export function formatLiveThreshold(firstTipOff: Date | null): string | null {
  if (!firstTipOff) return null;
  return `${DEFAULT_LIVE_THRESHOLD_MINUTES} minutes before first tip-off`;
}
