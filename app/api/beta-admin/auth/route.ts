import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminConfigError, isAcceptedAdminKey } from "@/lib/admin/admin-session";
import { createBetaAdminCookie, COOKIE_NAME } from "@/lib/beta-admin/validate-beta-admin";

/** POST /api/beta-admin/auth - Verify key and set session cookie */
export async function POST(request: NextRequest) {
  const configError = getAdminConfigError("beta");
  if (configError) {
    return NextResponse.json(
      { ok: false, error: configError },
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
  if (!isAcceptedAdminKey(key, "beta")) {
    return NextResponse.json(
      { ok: false, error: "Invalid key" },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createBetaAdminCookie(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}
