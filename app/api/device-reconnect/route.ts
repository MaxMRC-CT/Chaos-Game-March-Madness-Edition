import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

type RequestBody = {
  leagueId?: string;
  playerId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const leagueId = String(body.leagueId || "").trim();
    const playerId = String(body.playerId || "").trim();

    if (!leagueId || !playerId) {
      return NextResponse.json(
        { ok: false, error: "Missing league or player." },
        { status: 400 },
      );
    }

    const member = await prisma.leagueMember.findFirst({
      where: {
        id: playerId,
        leagueId,
      },
      select: {
        id: true,
        displayName: true,
        league: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, error: "Saved league session is no longer valid." },
        { status: 404 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(`cl_member_${leagueId}`, member.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      leagueId: member.league.id,
      leagueName: member.league.name,
      leagueCode: member.league.code,
      nickname: member.displayName,
      status: member.league.status,
    });
  } catch (error) {
    console.error("device-reconnect POST failed:", error);
    return NextResponse.json(
      { ok: false, error: "Could not reconnect to that league." },
      { status: 500 },
    );
  }
}
