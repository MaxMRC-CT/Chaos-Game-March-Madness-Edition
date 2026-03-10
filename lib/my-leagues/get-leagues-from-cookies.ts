import { prisma } from "@/lib/db";

export type MyLeagueEntry = {
  leagueId: string;
  memberId: string;
  league: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  member: {
    id: string;
    displayName: string;
  };
  rank?: number;
  points?: number;
};

const PREFIX = "cl_member_";

/**
 * Parse cl_member_* cookies into (leagueId, memberId) pairs.
 * Does not validate - just extracts.
 */
export function parseMemberCookies(
  cookies: Array<{ name: string; value: string }>,
): Array<{ leagueId: string; memberId: string }> {
  const pairs: Array<{ leagueId: string; memberId: string }> = [];
  for (const c of cookies) {
    if (!c.name.startsWith(PREFIX) || !c.value?.trim()) continue;
    const leagueId = c.name.slice(PREFIX.length);
    const memberId = c.value.trim();
    if (!leagueId || !memberId) continue;
    pairs.push({ leagueId, memberId });
  }
  return pairs;
}

/**
 * Validate pairs against DB and load league + member data.
 * Invalid or stale entries are skipped.
 */
export async function getLeaguesFromCookiePairs(
  pairs: Array<{ leagueId: string; memberId: string }>,
): Promise<MyLeagueEntry[]> {
  if (pairs.length === 0) return [];

  const uniqueLeagueIds = [...new Set(pairs.map((p) => p.leagueId))];
  const leagues = await prisma.league.findMany({
    where: { id: { in: uniqueLeagueIds } },
    select: { id: true, name: true, code: true, status: true },
  });
  const leagueById = new Map(leagues.map((l) => [l.id, l]));

  const members = await prisma.leagueMember.findMany({
    where: {
      id: { in: pairs.map((p) => p.memberId) },
      leagueId: { in: uniqueLeagueIds },
    },
    select: { id: true, leagueId: true, displayName: true },
  });
  const memberByKey = new Map(
    members.map((m) => [`${m.leagueId}:${m.id}`, m]),
  );

  const results: MyLeagueEntry[] = [];
  for (const { leagueId, memberId } of pairs) {
    const league = leagueById.get(leagueId);
    const member = memberByKey.get(`${leagueId}:${memberId}`);
    if (!league || !member) continue;
    results.push({
      leagueId: league.id,
      memberId: member.id,
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
        status: league.status,
      },
      member: { id: member.id, displayName: member.displayName },
    });
  }

  return results;
}
