import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const BETA_ADMIN_COOKIE_NAME = "cl_beta_admin";
export const LIVE_ADMIN_COOKIE_NAME = "cl_live_admin";

type AdminMode = "beta" | "live";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function getAcceptedKeys(mode: AdminMode) {
  const liveKey = process.env.LIVE_ADMIN_KEY?.trim();
  const betaKey = process.env.BETA_ADMIN_KEY?.trim();

  if (mode === "live") {
    return liveKey ? [liveKey] : [];
  }

  const accepted = new Set<string>();
  if (betaKey) accepted.add(betaKey);
  if (liveKey) accepted.add(liveKey);
  return Array.from(accepted);
}

function getCookieName(mode: AdminMode) {
  return mode === "live" ? LIVE_ADMIN_COOKIE_NAME : BETA_ADMIN_COOKIE_NAME;
}

function getHeaderNames(mode: AdminMode) {
  return mode === "live"
    ? ["x-live-admin-key", "x-admin-key"]
    : ["x-beta-admin-key", "x-live-admin-key", "x-admin-key"];
}

export function getAdminConfigError(mode: AdminMode) {
  const accepted = getAcceptedKeys(mode);
  if (accepted.length > 0) return null;
  return mode === "live"
    ? "LIVE_ADMIN_KEY not configured"
    : "BETA_ADMIN_KEY or LIVE_ADMIN_KEY not configured";
}

export function validateAdminSession(request: NextRequest, mode: AdminMode): NextResponse | null {
  const accepted = getAcceptedKeys(mode);
  if (accepted.length === 0) {
    return NextResponse.json({ ok: false, error: getAdminConfigError(mode) }, { status: 500 });
  }

  for (const headerName of getHeaderNames(mode)) {
    const headerValue = request.headers.get(headerName)?.trim();
    if (headerValue && accepted.includes(headerValue)) {
      return null;
    }
  }

  const cookieValue = request.cookies.get(getCookieName(mode))?.value;
  if (!cookieValue) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const acceptedHashes = new Set(accepted.map((key) => hashKey(key)));
  if (acceptedHashes.has(cookieValue)) {
    return null;
  }

  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export function isAcceptedAdminKey(key: string, mode: AdminMode) {
  const accepted = getAcceptedKeys(mode);
  return accepted.includes(key.trim());
}

export function createAdminCookieValue(key: string) {
  return hashKey(key.trim());
}

export function getAdminCookieName(mode: AdminMode) {
  return getCookieName(mode);
}
