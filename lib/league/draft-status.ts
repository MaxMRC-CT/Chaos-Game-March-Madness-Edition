import { prisma } from "@/lib/db";

/**
 * Returns true if the league draft is complete (status is LIVE or COMPLETE).
 * Draft is considered incomplete when status is DRAFT (or SETUP).
 */
export async function isDraftComplete(leagueId: string): Promise<boolean> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { status: true },
  });
  if (!league) return false;
  return league.status !== "DRAFT" && league.status !== "SETUP";
}
