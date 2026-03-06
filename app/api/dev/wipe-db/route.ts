import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function validateDevPanel(request: NextRequest): NextResponse | null {
  if (process.env.ENV_NAME !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dev panel only available in development" },
      { status: 403 }
    );
  }

  const devKey = process.env.DEV_PANEL_KEY;
  if (!devKey) {
    return NextResponse.json(
      { ok: false, error: "DEV_PANEL_KEY not configured" },
      { status: 500 }
    );
  }

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== devKey) {
    return NextResponse.json(
      { ok: false, error: "Invalid dev panel key" },
      { status: 403 }
    );
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("morning-meadow")) {
    return NextResponse.json(
      { ok: false, error: "Refused: production database detected" },
      { status: 403 }
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA public CASCADE;`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error).message),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "DEV database wiped. Run migrate then seed.",
    nextSteps: [
      "npx dotenv -e .env.development -- prisma migrate dev",
      "npx dotenv -e .env.development -- prisma db seed",
      "npm run seed:2025  # if using 2025 teams",
    ],
  });
}
