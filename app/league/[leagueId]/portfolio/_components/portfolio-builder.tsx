"use client";

import { useActionState, useState } from "react";
import { savePortfolioPicks } from "@/lib/actions/portfolio";
import { RoleType } from "@prisma/client";

const ROLE_COLORS = {
  HERO: "bg-blue-500/20 text-blue-200 border-blue-500/50",
  VILLAIN: "bg-red-500/20 text-red-200 border-red-500/50",
  CINDERELLA: "bg-violet-500/20 text-violet-200 border-violet-500/50",
} as const;

const ROLES: RoleType[] = ["HERO", "VILLAIN", "CINDERELLA"];
const PICKS_PER_ROLE = 2;
const CINDERELLA_MIN_SEED = 10;

type Team = {
  id: string;
  name: string;
  shortName: string | null;
  seed: number;
  region: string;
};

type RegionBucket = {
  region: string;
  teams: Team[];
};

type PickEntry = { teamId: string; role: RoleType };

const TIEBREAKER_MIN = 1;
const TIEBREAKER_MAX = 300;

export function PortfolioBuilder({
  leagueId,
  leagueStatus,
  regions,
  initialPicks,
  picksByTeamId,
  ownershipPct,
  initialChampionshipPrediction,
}: {
  leagueId: string;
  leagueStatus: string;
  regions: RegionBucket[];
  initialPicks: PickEntry[];
  picksByTeamId: Record<string, RoleType>;
  ownershipPct: number;
  initialChampionshipPrediction?: number;
}) {
  const [picks, setPicks] = useState<PickEntry[]>(() => initialPicks);
  const [tiebreaker, setTiebreaker] = useState<string>(
    initialChampionshipPrediction != null ? String(initialChampionshipPrediction) : "",
  );
  type FormState = { ok: true; saved?: boolean } | { ok: false; error: string } | null;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      const raw = formData.get("picks");
      const parsed = typeof raw === "string" ? JSON.parse(raw) as PickEntry[] : [];
      const tbRaw = formData.get("championshipPrediction");
      const championshipPrediction =
        typeof tbRaw === "string" && tbRaw.trim()
          ? parseInt(tbRaw, 10)
          : undefined;
      return savePortfolioPicks(leagueId, parsed, championshipPrediction) as Promise<FormState>;
    },
    null,
  );

  const counts = { HERO: 0, VILLAIN: 0, CINDERELLA: 0 };
  for (const p of picks) counts[p.role]++;

  const tiebreakerNum = tiebreaker.trim() ? parseInt(tiebreaker, 10) : NaN;
  const tiebreakerValid =
    Number.isInteger(tiebreakerNum) &&
    tiebreakerNum >= TIEBREAKER_MIN &&
    tiebreakerNum <= TIEBREAKER_MAX;

  const isLocked = leagueStatus !== "SETUP"; // LOCKED, DRAFT, LIVE, COMPLETE all lock picks
  const rosterValid =
    counts.HERO === PICKS_PER_ROLE &&
    counts.VILLAIN === PICKS_PER_ROLE &&
    counts.CINDERELLA === PICKS_PER_ROLE;
  const isValid = rosterValid && tiebreakerValid;

  function togglePick(teamId: string, role: RoleType, teamSeed: number) {
    if (isLocked) return;
    if (role === "CINDERELLA" && teamSeed < CINDERELLA_MIN_SEED) return;

    setPicks((prev) => {
      const existing = prev.find((p) => p.teamId === teamId);
      if (existing) {
        if (existing.role === role) {
          return prev.filter((p) => !(p.teamId === teamId && p.role === role));
        }
        return prev.map((p) => (p.teamId === teamId ? { ...p, role } : p));
      }
      const sameRole = prev.filter((p) => p.role === role);
      if (sameRole.length >= PICKS_PER_ROLE) {
        return prev;
      }
      return [...prev, { teamId, role }];
    });
  }

  function getTeamRole(teamId: string): RoleType | null {
    const p = picks.find((x) => x.teamId === teamId);
    return p?.role ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Counters */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
        {ROLES.map((role) => (
          <div
            key={role}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${ROLE_COLORS[role]}`}
          >
            <span className="font-semibold">{role}</span>
            <span className="tabular-nums">
              {counts[role]}/{PICKS_PER_ROLE}
            </span>
          </div>
        ))}
        {isLocked && (
          <p className="self-center text-sm text-amber-300">
            Picks locked — tournament started
          </p>
        )}
      </div>

      {state?.ok === false && state.error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true && state.saved ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          Roster saved.
        </p>
      ) : null}

      {/* Full field by region */}
      <div className="space-y-4">
        {regions.map(({ region, teams }) => (
          <section
            key={region}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <h2 className="mb-3 text-lg font-semibold text-neutral-100">
              {region}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {teams.map((team) => {
                const currentRole = getTeamRole(team.id);
                const isCinderellaEligible = team.seed >= CINDERELLA_MIN_SEED;
                return (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs tabular-nums text-neutral-300">
                        {team.seed}
                      </span>
                      <span className="truncate text-sm font-medium text-neutral-100">
                        {team.shortName || team.name}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {ROLES.map((role) => {
                        const atCapacity = !currentRole && counts[role] >= PICKS_PER_ROLE;
                        const disabled =
                          isLocked ||
                          (role === "CINDERELLA" && !isCinderellaEligible) ||
                          atCapacity;
                        const active = currentRole === role;
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={disabled}
                            onClick={() => togglePick(team.id, role, team.seed)}
                            className={`rounded px-2 py-1 text-xs font-medium transition ${
                              active ? ROLE_COLORS[role] : "bg-neutral-700/50 text-neutral-400 hover:bg-neutral-600/50"
                            } ${disabled && !active ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            {role.slice(0, 1)}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Tiebreaker (part of roster submission) */}
      {!isLocked && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
          <h3 className="mb-2 text-base font-semibold text-neutral-100">
            Championship Tiebreaker
          </h3>
          <p className="mb-3 text-sm text-neutral-400">
            Predict the combined total points in the National Championship. Closest without going
            over wins tiebreaks. Enter a number between {TIEBREAKER_MIN} and {TIEBREAKER_MAX}.
          </p>
          <input
            type="number"
            min={TIEBREAKER_MIN}
            max={TIEBREAKER_MAX}
            value={tiebreaker}
            onChange={(e) => setTiebreaker(e.target.value)}
            placeholder="e.g. 145"
            className="w-28 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
      )}

      {/* Submit */}
      {!isLocked && (
        <form action={formAction} className="flex flex-wrap items-center gap-4">
          <input
            type="hidden"
            name="picks"
            value={JSON.stringify(picks)}
            readOnly
          />
          <input
            type="hidden"
            name="championshipPrediction"
            value={tiebreakerValid ? tiebreakerNum : ""}
            readOnly
          />
          <button
            type="submit"
            disabled={pending || !isValid}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Saving…" : "Submit roster"}
          </button>
          {!rosterValid && (
            <span className="text-sm text-neutral-400">
              Select 2 Heroes, 2 Villains, 2 Cinderellas (seed 10+)
            </span>
          )}
          {rosterValid && !tiebreakerValid && (
            <span className="text-sm text-neutral-400">
              Enter championship tiebreaker ({TIEBREAKER_MIN}–{TIEBREAKER_MAX})
            </span>
          )}
        </form>
      )}

      {isLocked && ownershipPct > 0 && (
        <p className="text-sm text-neutral-400">
          Your share of each picked team: ~{ownershipPct}% (1 of {Math.round(100 / ownershipPct)} players)
        </p>
      )}
    </div>
  );
}
