import { prisma } from "@/lib/db";

/**
 * Returns true if the league draft/portfolio phase is complete (status is LIVE or COMPLETE).
 * Incomplete when status is SETUP, LOCKED, or DRAFT.
 */
export async function isDraftComplete(leagueId: string): Promise<boolean> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { status: true },
  });
  if (!league) return false;
  return league.status === "LIVE" || league.status === "COMPLETE";
}
