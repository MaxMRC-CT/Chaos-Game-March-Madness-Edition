import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const year = await prisma.tournamentYear.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      name: "March Madness 2026 (Using 2025 Field)",
    },
  });

  const teams = [
    // EAST
    { name: "UConn", seed: 1, region: "East" },
    { name: "Iowa State", seed: 2, region: "East" },
    { name: "Illinois", seed: 3, region: "East" },
    { name: "Auburn", seed: 4, region: "East" },
    { name: "San Diego State", seed: 5, region: "East" },
    { name: "BYU", seed: 6, region: "East" },
    { name: "Washington State", seed: 7, region: "East" },
    { name: "Florida Atlantic", seed: 8, region: "East" },
    { name: "Northwestern", seed: 9, region: "East" },
    { name: "Drake", seed: 10, region: "East" },
    { name: "Duquesne", seed: 11, region: "East" },
    { name: "UAB", seed: 12, region: "East" },
    { name: "Yale", seed: 13, region: "East" },
    { name: "Morehead State", seed: 14, region: "East" },
    { name: "South Dakota State", seed: 15, region: "East" },
    { name: "Stetson", seed: 16, region: "East" },

    // WEST
    { name: "North Carolina", seed: 1, region: "West" },
    { name: "Arizona", seed: 2, region: "West" },
    { name: "Baylor", seed: 3, region: "West" },
    { name: "Alabama", seed: 4, region: "West" },
    { name: "Saint Mary's", seed: 5, region: "West" },
    { name: "Clemson", seed: 6, region: "West" },
    { name: "Dayton", seed: 7, region: "West" },
    { name: "Mississippi State", seed: 8, region: "West" },
    { name: "Michigan State", seed: 9, region: "West" },
    { name: "Nevada", seed: 10, region: "West" },
    { name: "New Mexico", seed: 11, region: "West" },
    { name: "Grand Canyon", seed: 12, region: "West" },
    { name: "Charleston", seed: 13, region: "West" },
    { name: "Colgate", seed: 14, region: "West" },
    { name: "Long Beach State", seed: 15, region: "West" },
    { name: "Wagner", seed: 16, region: "West" },

    // SOUTH
    { name: "Houston", seed: 1, region: "South" },
    { name: "Marquette", seed: 2, region: "South" },
    { name: "Kentucky", seed: 3, region: "South" },
    { name: "Duke", seed: 4, region: "South" },
    { name: "Wisconsin", seed: 5, region: "South" },
    { name: "Texas Tech", seed: 6, region: "South" },
    { name: "Florida", seed: 7, region: "South" },
    { name: "Nebraska", seed: 8, region: "South" },
    { name: "Texas A&M", seed: 9, region: "South" },
    { name: "Colorado", seed: 10, region: "South" },
    { name: "NC State", seed: 11, region: "South" },
    { name: "James Madison", seed: 12, region: "South" },
    { name: "Vermont", seed: 13, region: "South" },
    { name: "Oakland", seed: 14, region: "South" },
    { name: "Western Kentucky", seed: 15, region: "South" },
    { name: "Longwood", seed: 16, region: "South" },

    // MIDWEST
    { name: "Purdue", seed: 1, region: "Midwest" },
    { name: "Tennessee", seed: 2, region: "Midwest" },
    { name: "Creighton", seed: 3, region: "Midwest" },
    { name: "Kansas", seed: 4, region: "Midwest" },
    { name: "Gonzaga", seed: 5, region: "Midwest" },
    { name: "South Carolina", seed: 6, region: "Midwest" },
    { name: "Texas", seed: 7, region: "Midwest" },
    { name: "Utah State", seed: 8, region: "Midwest" },
    { name: "TCU", seed: 9, region: "Midwest" },
    { name: "Virginia", seed: 10, region: "Midwest" },
    { name: "Oregon", seed: 11, region: "Midwest" },
    { name: "McNeese", seed: 12, region: "Midwest" },
    { name: "Samford", seed: 13, region: "Midwest" },
    { name: "Akron", seed: 14, region: "Midwest" },
    { name: "Saint Peter's", seed: 15, region: "Midwest" },
    { name: "Grambling State", seed: 16, region: "Midwest" },
  ];

  for (const team of teams) {
    const existing = await prisma.team.findFirst({
      where: {
        tournamentYearId: year.id,
        name: team.name,
      },
    });

    if (!existing) {
      await prisma.team.create({
        data: {
          tournamentYearId: year.id,
          name: team.name,
          seed: team.seed,
          region: team.region,
        },
      });
    }
  }

  console.log("✅ Seed complete (68 teams added)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });