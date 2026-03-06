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
      ownerDisplayName: pick.member.displayName,
      ownerMemberId: pick.memberId,
      role: pick.role,
    };
    if (!map[pick.teamId]) map[pick.teamId] = [];
    map[pick.teamId].push(o);
  }
  return map;
}
