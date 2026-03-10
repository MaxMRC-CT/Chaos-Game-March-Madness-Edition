import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const COOKIE_NAME = "cl_beta_admin";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Validate beta admin access. Uses BETA_ADMIN_KEY. Works in production. */
export function validateBetaAdmin(request: NextRequest): NextResponse | null {
  const adminKey = process.env.BETA_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { ok: false, error: "BETA_ADMIN_KEY not configured" },
      { status: 500 },
    );
  }

  const headerKey = request.headers.get("x-beta-admin-key");
  if (headerKey === adminKey) {
    return null;
  }

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  const expectedHash = hashKey(adminKey);
  if (cookieValue === expectedHash) {
    return null;
  }

  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export function createBetaAdminCookie(adminKey: string): string {
  return hashKey(adminKey);
}

export { COOKIE_NAME };
