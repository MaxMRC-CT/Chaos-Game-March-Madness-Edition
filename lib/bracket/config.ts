import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ALLOWED_REGIONS = ["East", "West", "South", "Midwest"] as const;
const DEFAULT_PAIRINGS: [string, string][] = [
  ["East", "West"],
  ["South", "Midwest"],
];

function isValidPairings(raw: unknown): raw is [string, string][] {
  if (!Array.isArray(raw) || raw.length !== 2) return false;
  const seen = new Set<string>();
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length !== 2) return false;
    const [a, b] = pair;
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (!ALLOWED_REGIONS.includes(a as (typeof ALLOWED_REGIONS)[number])) return false;
    if (!ALLOWED_REGIONS.includes(b as (typeof ALLOWED_REGIONS)[number])) return false;
    if (a === b) return false;
    if (seen.has(a) || seen.has(b)) return false;
    seen.add(a);
    seen.add(b);
  }
  return seen.size === 4;
}

/**
 * Load bracket config for a tournament year.
 * Reads data/{year}/config.json if it exists and is valid.
 * Falls back to default pairings on missing/invalid config.
 */
export function getBracketConfig(year: number): { finalFourPairings: [string, string][] } {
  const configPath = join(process.cwd(), "data", String(year), "config.json");

  if (!existsSync(configPath)) {
    return { finalFourPairings: DEFAULT_PAIRINGS };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as { finalFourPairings?: unknown };
    const pairings = parsed?.finalFourPairings;

    if (!isValidPairings(pairings)) {
      console.warn(
        `[bracket/config] Invalid finalFourPairings in data/${year}/config.json, using default. ` +
          "Expected: exactly 2 pairings, each [regionA, regionB], all 4 regions (East, West, South, Midwest) used once."
      );
      return { finalFourPairings: DEFAULT_PAIRINGS };
    }

    return { finalFourPairings: pairings };
  } catch (err) {
    console.warn(
      `[bracket/config] Failed to load data/${year}/config.json:`,
      err instanceof Error ? err.message : err,
      "- using default pairings"
    );
    return { finalFourPairings: DEFAULT_PAIRINGS };
  }
}
