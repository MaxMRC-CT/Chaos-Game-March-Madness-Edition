import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = String(searchParams.get("code") || "").trim();

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ ok: false, error: "Invalid Game PIN" }, { status: 400 });
    }

    const league = await prisma.league.findUnique({
      where: { code },
      select: { id: true, status: true },
    });

    if (!league) {
      return NextResponse.json({ ok: false, error: "Game PIN not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, leagueId: league.id, status: league.status });
  } catch (err) {
    console.error("league-by-pin GET failed:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}