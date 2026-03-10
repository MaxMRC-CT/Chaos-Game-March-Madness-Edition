export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWarRoomData } from "@/lib/war-room/get-data";

/** GET /api/war-room?leagueId=X&mode=all|highlights&limit=N */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = String(searchParams.get("leagueId") || "").trim();
    const mode = String(searchParams.get("mode") || "all").trim() as "all" | "highlights";
    const limitRaw = Number(searchParams.get("limit") || 15);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 15;

    if (!leagueId) {
      return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;

    const data = await getWarRoomData(leagueId, {
      mode,
      limit,
      memberId,
    });

    if (!data) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("WAR ROOM API ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load war room state",
      },
      { status: 500 },
    );
  }
}
