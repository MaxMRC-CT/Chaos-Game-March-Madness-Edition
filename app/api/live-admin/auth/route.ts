import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminConfigError, isAcceptedAdminKey } from "@/lib/admin/admin-session";
import { createLiveAdminCookie, COOKIE_NAME } from "@/lib/live-admin/validate-live-admin";

export async function POST(request: NextRequest) {
  const configError = getAdminConfigError("live");
  if (configError) {
    return NextResponse.json({ ok: false, error: configError }, { status: 500 });
  }

  let body: { key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const key = String(body.key ?? "").trim();
  if (!isAcceptedAdminKey(key, "live")) {
    return NextResponse.json({ ok: false, error: "Invalid key" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createLiveAdminCookie(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}
