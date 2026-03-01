import { prisma } from "../lib/db";

async function main() {
  const res = await prisma.leagueMember.updateMany({
    where: { displayName: null },
    data: { displayName: undefined }, // placeholder
  });

  // updateMany can't set from another field, so do it in two steps:
  const members = await prisma.leagueMember.findMany({
    where: { displayName: null },
    select: { id: true, nickname: true },
  });

  for (const m of members) {
    await prisma.leagueMember.update({
      where: { id: m.id },
      data: { displayName: m.nickname },
    });
  }

  console.log("Backfilled:", members.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });