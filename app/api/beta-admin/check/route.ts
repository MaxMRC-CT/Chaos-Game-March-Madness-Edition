import { NextRequest } from "next/server";
import { validateBetaAdmin } from "@/lib/beta-admin/validate-beta-admin";

/** GET /api/beta-admin/check - Verify session, returns { ok: true } if authenticated */
export async function GET(request: NextRequest) {
  const err = validateBetaAdmin(request);
  if (err) return err;
  return Response.json({ ok: true });
}
