/**
 * Smoke test: reset league, simulate whole tournament, assert champion exists.
 *
 * Run: npm run smoke
 *
 * Prerequisites:
 *   - npm run seed:all (64+ teams for year 2025)
 *   - npm run dev (server running)
 *   - .env.development with DEV_PANEL_KEY
 */
import "dotenv/config";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const LEAGUE_CODE = process.env.SMOKE_LEAGUE_CODE ?? "123456";
const YEAR = 2025;

async function fetchApi(
  path: string,
  body: object
): Promise<{ ok: boolean; error?: string; championTeamId?: string; roundHealth?: unknown }> {
  const devKey = process.env.DEV_PANEL_KEY;
  if (!devKey) {
    throw new Error("DEV_PANEL_KEY required. Set in .env.development");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-key": devKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    championTeamId?: string;
    roundHealth?: unknown;
  };

  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  return { ...data, ok: data.ok ?? true };
}

async function main() {
  console.log("[smoke] Base URL:", BASE_URL);
  console.log("[smoke] League code:", LEAGUE_CODE);

  console.log("[smoke] 1. Reset LIVE league...");
  const resetRes = await fetchApi("/api/dev/reset-live", {
    code: LEAGUE_CODE,
    year: YEAR,
  });
  if (!resetRes.ok) {
    throw new Error(`Reset failed: ${resetRes.error}`);
  }
  console.log("[smoke]   OK");

  console.log("[smoke] 2. Simulate whole tournament (RANDOM mode)...");
  const simRes = await fetchApi("/api/dev/simulate", {
    leagueCode: LEAGUE_CODE,
    year: YEAR,
    mode: "RANDOM",
  });

  if (!simRes.ok) {
    throw new Error(`Simulate failed: ${simRes.error}`);
  }
  if (!simRes.championTeamId) {
    throw new Error("Simulate succeeded but no championTeamId in response");
  }

  const rh = simRes.roundHealth as { ok?: boolean; rounds?: Array<{ round: string; gamesExist: number; expected: number }> } | undefined;
  if (rh && !rh.ok) {
    throw new Error(`Round health failed: ${JSON.stringify(rh)}`);
  }

  console.log("[smoke]   Champion team ID:", simRes.championTeamId);
  console.log("[smoke]   Round health OK");
  if (rh?.rounds) {
    for (const r of rh.rounds) {
      if (r.expected > 0) {
        console.log(`[smoke]     ${r.round}: ${r.gamesExist}/${r.expected} games`);
      }
    }
  }

  console.log("[smoke] PASS");
}

main().catch((err) => {
  console.error("[smoke] FAIL:", err.message);
  process.exit(1);
});
