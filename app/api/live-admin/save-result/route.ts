import { NextRequest, NextResponse } from "next/server";
import { Round } from "@prisma/client";
import { validateLiveAdmin } from "@/lib/live-admin/validate-live-admin";
import { applyLiveAdminResult } from "@/lib/live-admin/tournament-console";

const VALID_ROUNDS = new Set<Round>(["R64", "R32", "S16", "E8", "F4", "FINAL"]);

export async function POST(request: NextRequest) {
  const err = validateLiveAdmin(request);
  if (err) return err;

  let body: {
    leagueId?: string;
    round?: Round;
    gameNo?: number;
    winnerTeamId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const leagueId = String(body.leagueId ?? "").trim();
  const round = body.round;
  const gameNo = Number(body.gameNo ?? 0);
  const winnerTeamId = String(body.winnerTeamId ?? "").trim();

  if (!leagueId || !round || !VALID_ROUNDS.has(round) || !Number.isInteger(gameNo) || gameNo < 1 || !winnerTeamId) {
    return NextResponse.json({ ok: false, error: "Invalid result payload" }, { status: 400 });
  }

  try {
    const data = await applyLiveAdminResult({ leagueId, round, gameNo, winnerTeamId });
    return NextResponse.json({ ok: true, data, message: "Result saved" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save result" },
      { status: 400 },
    );
  }
}
