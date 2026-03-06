/**
 * Dev-only: Reset portfolio picks and set league back to SETUP for a given PIN.
 * Use to re-test the roster builder flow without deleting the league.
 *
 * Run: npx tsx scripts/dev-reset-portfolio.ts <6-digit-code>
 * Example: npx tsx scripts/dev-reset-portfolio.ts 123456
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const code = process.argv[2]?.trim();
if (!code || !/^\d{6}$/.test(code)) {
  console.error("Usage: npx tsx scripts/dev-reset-portfolio.ts <6-digit-code>");
  process.exit(1);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("morning-meadow") || dbUrl.includes("prod")) {
    console.error("Refused: production database detected");
    process.exit(1);
  }

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, name: true, status: true },
  });

  if (!league) {
    console.error(`League with code ${code} not found`);
    process.exit(1);
  }

  await prisma.portfolioPick.deleteMany({ where: { leagueId: league.id } });
  await prisma.league.update({
    where: { id: league.id },
    data: { status: "SETUP" },
  });

  console.log(`Reset league "${league.name}" (${code}): portfolio picks cleared, status = SETUP`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
