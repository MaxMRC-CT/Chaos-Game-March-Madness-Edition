import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

/** GET /api/dev/dev-login?leagueId=X&memberId=Y - DEV only, sets session and redirects */
export async function GET(request: NextRequest) {
  if (process.env.ENV_NAME !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("morning-meadow") || dbUrl.includes("prod")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId")?.trim();
  const memberId = searchParams.get("memberId")?.trim();

  if (!leagueId || !memberId) {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  const member = await prisma.leagueMember.findFirst({
    where: { id: memberId, leagueId },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(`cl_member_${leagueId}`, memberId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const base = new URL(request.url).origin;
  return NextResponse.redirect(new URL(`/league/${leagueId}/dashboard`, base));
}
