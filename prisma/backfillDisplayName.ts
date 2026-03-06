import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Backfill displayName for any LeagueMember rows that have an empty displayName.
 * displayName is required now, so it won't be null — but older/bad data might be "" or " ".
 */
async function main() {
  const members = await prisma.leagueMember.findMany({
    where: {
      OR: [{ displayName: "" }, { displayName: " " }],
    },
    select: {
      id: true,
      nicknameKey: true,
    },
  });

  if (members.length === 0) {
    console.log("✅ No LeagueMembers need backfill.");
    return;
  }

  const updates = members.map((m) => {
    const fallback =
      (m.nicknameKey && m.nicknameKey.trim()) || `Player-${m.id.slice(0, 6)}`;

    return prisma.leagueMember.update({
      where: { id: m.id },
      data: { displayName: fallback },
    });
  });

  const res = await prisma.$transaction(updates);
  console.log(`✅ Backfilled displayName for ${res.length} LeagueMembers.`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });