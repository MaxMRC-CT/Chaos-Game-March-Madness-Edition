import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createBetaAdminCookie, COOKIE_NAME } from "@/lib/beta-admin/validate-beta-admin";

/** POST /api/beta-admin/auth - Verify key and set session cookie */
export async function POST(request: NextRequest) {
  const adminKey = process.env.BETA_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { ok: false, error: "BETA_ADMIN_KEY not configured" },
      { status: 500 },
    );
  }

  let body: { key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const key = String(body.key ?? "").trim();
  if (key !== adminKey) {
    return NextResponse.json(
      { ok: false, error: "Invalid key" },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createBetaAdminCookie(adminKey), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ ok: true });
}
