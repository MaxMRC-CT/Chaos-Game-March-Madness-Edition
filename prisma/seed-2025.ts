/**
 * Seed 2025 tournament year and teams from data/2025/teams.csv.
 * Idempotent: re-running won't duplicate teams.
 *
 * Usage: npx dotenv -e .env.development -- tsx prisma/seed-2025.ts
 */
import "dotenv/config";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "../lib/db";

const CSV_PATH = path.join(process.cwd(), "data", "2025", "teams.csv");

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`teams.csv not found at ${CSV_PATH}`);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    throw new Error(`teams.csv must have header + at least 1 row`);
  }

  const header = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.indexOf("name");
  const seedIdx = header.indexOf("seed");
  const regionIdx = header.indexOf("region");
  const shortNameIdx = header.indexOf("shortname");
  const logoUrlIdx = header.indexOf("logourl");

  if (nameIdx < 0 || seedIdx < 0 || regionIdx < 0) {
    throw new Error(`teams.csv must have columns: name, seed, region, shortName, logoUrl`);
  }

  const tournamentYear = await prisma.tournamentYear.upsert({
    where: { year: 2025 },
    update: {},
    create: {
      year: 2025,
      name: "2025",
    },
    select: { id: true },
  });

  let created = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const name = cells[nameIdx]?.trim();
    const seedStr = cells[seedIdx]?.trim();
    const region = cells[regionIdx]?.trim();

    if (!name || !seedStr || !region) continue;

    const seed = parseInt(seedStr, 10);
    if (isNaN(seed)) continue;

    const shortName = shortNameIdx >= 0 ? cells[shortNameIdx]?.trim() || null : null;
    const logoUrl = logoUrlIdx >= 0 ? (cells[logoUrlIdx]?.trim() || null) : null;

    const existing = await prisma.team.findFirst({
      where: {
        tournamentYearId: tournamentYear.id,
        name,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.team.create({
        data: {
          tournamentYearId: tournamentYear.id,
          name,
          seed,
          region,
          shortName: shortName || null,
          logoUrl: logoUrl || null,
        },
      });
      created++;
    }
  }

  const total = await prisma.team.count({
    where: { tournamentYearId: tournamentYear.id },
  });
  console.log(`✅ 2025 seed complete: ${total} teams (${created} newly created)`);
}

main()
  .catch((e) => {
    console.error("❌ seed-2025 failed:", (e as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
