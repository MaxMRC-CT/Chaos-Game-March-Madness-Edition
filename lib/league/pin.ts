import { prisma } from "@/lib/db";

export async function generateLeagueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const exists = await prisma.league.findUnique({ where: { code } });
    if (!exists) return code;
  }

  throw new Error("Failed to generate a unique league code");
}