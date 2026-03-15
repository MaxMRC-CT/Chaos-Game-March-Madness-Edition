import { NextRequest } from "next/server";
import {
  BETA_ADMIN_COOKIE_NAME,
  createAdminCookieValue,
  validateAdminSession,
} from "@/lib/admin/admin-session";

const COOKIE_NAME = BETA_ADMIN_COOKIE_NAME;

/** Validate beta admin access. Accepts BETA_ADMIN_KEY and LIVE_ADMIN_KEY. */
export function validateBetaAdmin(request: NextRequest) {
  return validateAdminSession(request, "beta");
}

export function createBetaAdminCookie(adminKey: string) {
  return createAdminCookieValue(adminKey);
}

export { COOKIE_NAME };
