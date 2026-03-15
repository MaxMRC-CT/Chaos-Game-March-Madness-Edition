import { NextRequest, NextResponse } from "next/server";
import { validateLiveAdmin } from "@/lib/live-admin/validate-live-admin";
import { getLiveAdminConsoleData } from "@/lib/live-admin/tournament-console";

export async function GET(request: NextRequest) {
  const err = validateLiveAdmin(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const leagueId = searchParams.get("leagueId")?.trim();

  const data = await getLiveAdminConsoleData({ code, leagueId });
  return NextResponse.json({ ok: true, data });
}
