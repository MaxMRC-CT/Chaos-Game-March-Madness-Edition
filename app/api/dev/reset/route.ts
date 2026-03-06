import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function validateDevPanel() {
  if (process.env.ENV_NAME !== "development") {
    return NextResponse.json(
      { error: "Dev panel only available in development" },
      { status: 403 },
    );
  }

  const key = process.env.DEV_PANEL_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "DEV_PANEL_KEY not configured" },
      { status: 500 },
    );
  }

  return null;
}

export async function POST(request: Request) {
  const envCheck = validateDevPanel();
  if (envCheck) return envCheck;

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== process.env.DEV_PANEL_KEY) {
    return NextResponse.json({ error: "Invalid dev panel key" }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  // extra safety: refuse if URL looks like your prod host
  if (dbUrl.includes("morning-meadow")) {
    return NextResponse.json(
      { error: "Refused: DATABASE_URL contains 'morning-meadow' (production DB)" },
      { status: 403 },
    );
  }

  // wipe dev schema
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "public" CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "public"`);

  return NextResponse.json({
    success: true,
    message:
      "Dev DB wiped. NOW run:\n" +
      "1) npx dotenv -e .env.development -- npx prisma migrate dev --schema prisma/schema.prisma\n" +
      "2) npx dotenv -e .env.development -- npx prisma db seed --schema prisma/schema.prisma",
  });
}