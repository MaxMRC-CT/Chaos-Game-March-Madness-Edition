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
    <section className="space-y-3 rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a]">
      <h2 className="text-lg font-semibold tracking-wide text-neutral-100">MY STORY</h2>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {ROLE_LABELS.map((role) => {
          const pick = myPicks.find((item) => item.role === role);
          const result = pick ? resultByTeamId[pick.teamId] : undefined;
          const status = !result
            ? "UNKNOWN"
            : result.eliminatedRound === "CHAMP" || result.eliminatedRound === null
              ? "ALIVE"
              : "ELIMINATED";
          const points =
            role === "HERO"
              ? standingsRow?.HERO || 0
              : role === "VILLAIN"
                ? standingsRow?.VILLAIN || 0
                : standingsRow?.CINDERELLA || 0;
          const isEliminated = status === "ELIMINATED";

          return (
            <article
              key={role}
              className={`rounded-xl border p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition duration-200 hover:brightness-110 ${ROLE_STYLES[role]} ${
                isEliminated ? "opacity-70" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/25 text-xs">
                    {pick?.team.shortName?.slice(0, 2).toUpperCase() || "CL"}
                  </span>
                  <p className="text-xs font-semibold tracking-wide">{role}</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    status === "ALIVE"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : status === "ELIMINATED"
                        ? "border-red-500/40 bg-red-500/10 text-red-200"
                        : "border-neutral-500/40 bg-neutral-500/10 text-neutral-300"
                  }`}
                >
                  {status === "ELIMINATED" ? "ELIMINATED ☠" : status}
                </span>
              </div>

              {pick ? (
                <div className="space-y-2">
                  <p className="text-base font-semibold tracking-tight text-neutral-100">
                    {pick.team.shortName || pick.team.name}
                  </p>
                  <div className="flex gap-2 text-xs text-neutral-300">
                    <span className="rounded bg-neutral-900/60 px-2 py-0.5">Seed {pick.team.seed}</span>
                    <span className="rounded bg-neutral-900/60 px-2 py-0.5">{pick.team.region}</span>
                  </div>

                  <p className="pt-1 text-xs font-medium text-neutral-200">Contribution: {points} pts</p>
                  {role === "VILLAIN" && isEliminated && points > 0 ? (
                    <p className="text-xs font-semibold text-red-200">+{points} CHAOS EARNED</p>
                  ) : null}

                  <p className="text-xs text-neutral-300">{threatMeter(role, pick.team.seed)}</p>
                  <p className="text-xs text-neutral-400">{whatYouNeedNext(role)}</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Not drafted yet</p>
              )}
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
