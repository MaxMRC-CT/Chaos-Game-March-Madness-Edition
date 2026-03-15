import { NextRequest } from "next/server";
import {
  LIVE_ADMIN_COOKIE_NAME,
  createAdminCookieValue,
  validateAdminSession,
} from "@/lib/admin/admin-session";

const COOKIE_NAME = LIVE_ADMIN_COOKIE_NAME;

/** Validate live admin access. Accepts LIVE_ADMIN_KEY only. */
export function validateLiveAdmin(request: NextRequest) {
  return validateAdminSession(request, "live");
}

export function createLiveAdminCookie(adminKey: string) {
  return createAdminCookieValue(adminKey);
}

export { COOKIE_NAME };
