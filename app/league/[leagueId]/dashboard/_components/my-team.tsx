"use client";

import { WarRoomResponse } from "./types";

const ROLE_STYLES = {
  HERO: "border-blue-500/50 bg-blue-500/10",
  VILLAIN: "border-red-500/50 bg-red-500/10",
  CINDERELLA: "border-violet-500/50 bg-violet-500/10",
} as const;

const ROLE_LABELS = ["HERO", "VILLAIN", "CINDERELLA"] as const;

export function MyTeam({
  myPicks,
  standingsRow,
  resultByTeamId,
}: {
  myPicks: WarRoomResponse["myPicks"];
  standingsRow: WarRoomResponse["standings"][number] | null;
  resultByTeamId: Record<string, WarRoomResponse["teamResults"][number] | undefined>;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111827]/95 backdrop-blur-sm p-4 sm:p-5 shadow-[0_0_18px_rgba(251,98,35,0.06)] transition duration-200 motion-reduce:transition-none motion-reduce:transform-none supports-[hover:hover]:hover:-translate-y-1 supports-[hover:hover]:hover:shadow-[0_0_28px_rgba(251,98,35,0.14)]">
      <h2 className="text-base font-semibold tracking-wide text-neutral-100 sm:text-lg">My Story</h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {ROLE_LABELS.map((role) => {
          const rolePicks = myPicks.filter((item) => item.role === role);
          const totalRolePoints =
            role === "HERO"
              ? standingsRow?.HERO ?? 0
              : role === "VILLAIN"
                ? standingsRow?.VILLAIN ?? 0
                : standingsRow?.CINDERELLA ?? 0;
          const pointsPerPick = rolePicks.length > 0 ? Math.round(totalRolePoints / rolePicks.length) : 0;
          return (
            <article
              key={role}
              className={`min-w-0 rounded-xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition duration-200 hover:brightness-110 ${ROLE_STYLES[role]}`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <p className="whitespace-nowrap text-xs font-semibold tracking-wide">{role}</p>
                <span className="rounded-full border border-neutral-600 bg-neutral-800/60 px-2 py-0.5 text-[10px] text-neutral-300">
                  {rolePicks.length}/2
                </span>
              </div>
              {rolePicks.length === 0 ? (
                <p className="text-sm text-neutral-400">No {role.toLowerCase()} picks yet</p>
              ) : (
                <ul className="space-y-2">
                  {rolePicks.map((pick) => {
                    const result = resultByTeamId[pick.teamId];
                    const status = !result
                      ? "UNKNOWN"
                      : result.eliminatedRound === "CHAMP" || result.eliminatedRound === null
                        ? "ALIVE"
                        : "ELIMINATED";
                    const statusLabel = status === "UNKNOWN" ? "TBD" : status === "ELIMINATED" ? "ELIMINATED ☠" : status;
                    const isEliminated = status === "ELIMINATED";
                    return (
                      <li
                        key={pick.teamId}
                        className={`rounded-lg border border-neutral-700/80 px-3 py-2 ${isEliminated ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-neutral-100">
                            {pick.team.shortName || pick.team.name}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                              status === "ALIVE"
                                ? "bg-emerald-500/20 text-emerald-200"
                                : status === "ELIMINATED"
                                  ? "bg-red-500/20 text-red-200"
                                  : "bg-neutral-600/40 text-neutral-400"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">
                          Seed {pick.team.seed} • {pick.team.region}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-xs font-medium text-neutral-200">
                {role} total: {totalRolePoints} pts
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function threatMeter(role: "HERO" | "VILLAIN" | "CINDERELLA", seed: number) {
  if (role === "HERO") {
    if (seed <= 3) return "Title odds: High";
    if (seed <= 7) return "Title odds: Medium";
    return "Title odds: Low";
  }

  if (role === "VILLAIN") {
    if (seed >= 10) return "Chaos potential: 🔥🔥🔥";
    if (seed >= 6) return "Chaos potential: 🔥🔥";
    return "Chaos potential: 🔥";
  }

  if (seed >= 11) return "Upset path: 1 win to cash";
  if (seed >= 7) return "Upset path: 2 wins to cash";
  return "Upset path: 3 wins to cash";
}

function whatYouNeedNext(role: "HERO" | "VILLAIN" | "CINDERELLA") {
  if (role === "HERO") return "What you need next: one win (+4), then Sweet 16 bonus unlocks.";
  if (role === "VILLAIN") return "What you need next: a clean elimination to bank villain points.";
  return "What you need next: stack win #1 and #2 for the big Cinderella ladder.";
}
