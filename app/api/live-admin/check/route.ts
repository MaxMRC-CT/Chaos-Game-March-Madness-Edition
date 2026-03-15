import { NextRequest } from "next/server";
import { validateLiveAdmin } from "@/lib/live-admin/validate-live-admin";

export async function GET(request: NextRequest) {
  const err = validateLiveAdmin(request);
  if (err) return err;
  return Response.json({ ok: true });
}
