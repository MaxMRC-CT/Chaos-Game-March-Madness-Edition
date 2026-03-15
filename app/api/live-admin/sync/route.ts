import { NextRequest, NextResponse } from "next/server";
import { validateLiveAdmin } from "@/lib/live-admin/validate-live-admin";
import { evaluateStatusTransitions } from "@/lib/league/lifecycle";
import { computeLeagueStandings } from "@/lib/scoring/compute";
import { revalidateLeagueViews } from "@/lib/league/revalidate";

export async function POST(request: NextRequest) {
  const err = validateLiveAdmin(request);
  if (err) return err;

  let body: { leagueId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const leagueId = String(body.leagueId ?? "").trim();
  if (!leagueId) {
    return NextResponse.json({ ok: false, error: "leagueId is required" }, { status: 400 });
  }

  await evaluateStatusTransitions(leagueId);
  await computeLeagueStandings(leagueId);
  revalidateLeagueViews(leagueId);

  return NextResponse.json({ ok: true, message: "League data synced" });
}
