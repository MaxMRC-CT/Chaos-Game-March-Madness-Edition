import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getLeaguesFromCookiePairs,
  parseMemberCookies,
} from "@/lib/my-leagues/get-leagues-from-cookies";

export async function GET() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const pairs = parseMemberCookies(
    all.map((c) => ({ name: c.name, value: c.value ?? "" })),
  );
  const entries = await getLeaguesFromCookiePairs(pairs);
  return NextResponse.json({ leagues: entries });
}
