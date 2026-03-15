import { NextRequest, NextResponse } from "next/server";
import { ensureDemoLeague } from "@/lib/demo/ensure-demo-league";

const ALLOWED_VIEWS = new Set([
  "dashboard",
  "standings",
  "games",
  "more",
  "war-room",
  "portfolio",
  "bracket",
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ view: string }> },
) {
  const { view } = await context.params;

  if (!ALLOWED_VIEWS.has(view)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const demo = await ensureDemoLeague();
    const target = new URL(`/league/${demo.leagueId}/${view}`, request.url);
    target.search = request.nextUrl.search;

    const response = NextResponse.redirect(target);
    response.cookies.set(`cl_member_${demo.leagueId}`, demo.memberId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to prepare demo league",
      },
      { status: 500 },
    );
  }
}
