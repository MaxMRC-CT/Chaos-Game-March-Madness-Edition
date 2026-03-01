import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = String(searchParams.get("leagueId") || "").trim();

  if (!leagueId) {
    return NextResponse.json({ ok: false, members: [], error: "Missing leagueId" }, { status: 400 });
  }

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      displayName: true,
      isAdmin: true,
    },
  });

  return NextResponse.json({ ok: true, members });
}
