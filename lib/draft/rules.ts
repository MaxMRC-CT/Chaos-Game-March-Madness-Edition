import { DraftRole } from "@prisma/client";

export const DRAFT_ROLES_BY_ROUND: DraftRole[] = [
  "HERO",
  "VILLAIN",
  "CINDERELLA",
];

export function getRoundIndexForPick(pickNumber: number, memberCount: number) {
  if (pickNumber <= 0 || memberCount <= 0) return 0;
  return Math.floor((pickNumber - 1) / memberCount);
}

export function getRoleForPick(pickNumber: number, memberCount: number): DraftRole {
  const roundIndex = getRoundIndexForPick(pickNumber, memberCount);
  return DRAFT_ROLES_BY_ROUND[Math.min(roundIndex, DRAFT_ROLES_BY_ROUND.length - 1)];
}

export function getSnakeDraftPosition(
  pickNumber: number,
  memberCount: number,
): number | null {
  if (memberCount <= 0 || pickNumber <= 0) return null;

  const zeroBasedPick = pickNumber - 1;
  const roundIndex = Math.floor(zeroBasedPick / memberCount);
  const pickIndexInRound = zeroBasedPick % memberCount;
  const isForwardRound = roundIndex % 2 === 0;

  return isForwardRound
    ? pickIndexInRound + 1
    : memberCount - pickIndexInRound;
}

export function getMaxDraftPicks(memberCount: number) {
  return memberCount * DRAFT_ROLES_BY_ROUND.length;
}
