type PickWithOwner = {
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  memberId: string;
  member: { displayName: string };
};

export type TeamOwner = {
  ownerDisplayName: string;
  ownerMemberId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
};

/** v2: Multiple owners per team (portfolio picks). */
export function buildTeamOwnershipMap(picks: PickWithOwner[]) {
  const map: Record<string, TeamOwner[]> = {};
  for (const pick of picks) {
    const o: TeamOwner = {
      ownerDisplayName: pick.member.displayName || "Unknown",
      ownerMemberId: pick.memberId,
      role: pick.role,
    };
    if (!map[pick.teamId]) map[pick.teamId] = [];
    map[pick.teamId].push(o);
  }
  return map;
}

/** v2.1: League ownership % by role per team. After picks lock. */
export type OwnershipByRole = {
  heroPct: number;
  villainPct: number;
  cinderellaPct: number;
};

export function computeOwnershipByRole(
  picks: Array<{ teamId: string; role: "HERO" | "VILLAIN" | "CINDERELLA"; memberId: string }>,
  memberCount: number,
): Record<string, OwnershipByRole> {
  const result: Record<string, OwnershipByRole> = {};
  if (memberCount <= 0) return result;

  const byTeam = new Map<
    string,
    { hero: number; villain: number; cinderella: number }
  >();
  for (const pick of picks) {
    let entry = byTeam.get(pick.teamId);
    if (!entry) {
      entry = { hero: 0, villain: 0, cinderella: 0 };
      byTeam.set(pick.teamId, entry);
    }
    if (pick.role === "HERO") entry.hero++;
    else if (pick.role === "VILLAIN") entry.villain++;
    else entry.cinderella++;
  }

  for (const [teamId, counts] of byTeam) {
    result[teamId] = {
      heroPct: Math.round((counts.hero / memberCount) * 100),
      villainPct: Math.round((counts.villain / memberCount) * 100),
      cinderellaPct: Math.round((counts.cinderella / memberCount) * 100),
    };
  }

  return result;
}
