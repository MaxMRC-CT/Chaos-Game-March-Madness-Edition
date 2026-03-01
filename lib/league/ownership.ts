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

export function buildTeamOwnershipMap(picks: PickWithOwner[]) {
  const map: Record<string, TeamOwner> = {};
  for (const pick of picks) {
    map[pick.teamId] = {
      ownerDisplayName: pick.member.displayName,
      ownerMemberId: pick.memberId,
      role: pick.role,
    };
  }
  return map;
}
