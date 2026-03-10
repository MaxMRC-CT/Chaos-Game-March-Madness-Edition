import { LeagueStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateBetaAdmin } from "@/lib/beta-admin/validate-beta-admin";

const VALID_STATUSES: LeagueStatus[] = [
  "SETUP",
  "LOCKED",
  "DRAFT",
  "LIVE",
  "COMPLETE",
];

/** POST /api/beta-admin/set-status - Beta admin override: force league status (SETUP, LOCKED, LIVE, COMPLETE) */
export async function POST(request: NextRequest) {
  const err = validateBetaAdmin(request);
  if (err) return err;

  let body: { leagueId?: string; code?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const statusParam = (body.status ?? "").toUpperCase();
  if (
    !VALID_STATUSES.includes(statusParam as LeagueStatus)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const leagueIdParam = body.leagueId?.trim();
  const codeParam = body.code?.trim();

  const league = leagueIdParam
    ? await prisma.league.findUnique({ where: { id: leagueIdParam } })
    : codeParam && /^\d{6}$/.test(codeParam)
      ? await prisma.league.findUnique({ where: { code: codeParam } })
      : null;

  if (!league) {
    return NextResponse.json(
      { ok: false, error: "League not found. Provide leagueId or code." },
      { status: 404 },
    );
  }

  await prisma.league.update({
    where: { id: league.id },
    data: { status: statusParam as LeagueStatus },
  });

  return NextResponse.json({
    ok: true,
    message: `League status set to ${statusParam}.`,
  });
}
