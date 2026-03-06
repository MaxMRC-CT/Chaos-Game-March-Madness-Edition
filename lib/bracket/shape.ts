/**
 * Shapes TournamentGame data into a UI-friendly bracket structure.
 * Uses existing winnerTeamId/loserTeamId; no schema changes.
 */

import type { Round } from "@prisma/client";

export const BRACKET_ROUNDS: Round[] = ["R64", "R32", "S16", "E8", "F4", "FINAL"];

export const ROUND_LABELS: Record<Round, string> = {
  R64: "Round of 64",
  R32: "Round of 32",
  S16: "Sweet 16",
  E8: "Elite 8",
  F4: "Final Four",
  FINAL: "Championship",
  CHAMP: "Champion",
};

export type BracketTeam = {
  id: string;
  seed: number;
  name: string;
};

export type BracketGame = {
  id: string;
  round: Round;
  gameNo: number;
  teamA: BracketTeam;
  teamB: BracketTeam;
  winnerTeamId: string | null;
};

export type BracketRound = {
  round: Round;
  label: string;
  games: BracketGame[];
};

export type BracketData = {
  rounds: BracketRound[];
};

type TeamLite = { id: string; name: string; shortName?: string | null; seed: number };
type GameInput = {
  id: string;
  round: Round;
  gameNo: number;
  winnerTeamId: string;
  loserTeamId: string;
  winner?: TeamLite | null;
  loser?: TeamLite | null;
};

function toBracketTeam(
  team: TeamLite | null | undefined,
  teamById?: Record<string, TeamLite>,
): BracketTeam {
  if (!team) return { id: "tbd", seed: 0, name: "TBD" };
  const t = teamById?.[team.id] ?? team;
  return {
    id: t.id,
    seed: t.seed,
    name: t.shortName || t.name,
  };
}

/**
 * Normalizes games into bracket structure.
 * teamA = winner, teamB = loser (we only have winner/loser in DB).
 * winnerTeamId marks which row to highlight.
 */
export function shapeBracketData(
  games: GameInput[],
  teamById?: Record<string, TeamLite>,
): BracketData {
  const filtered = games.filter((g) => BRACKET_ROUNDS.includes(g.round));
  const byRound = new Map<Round, BracketGame[]>();

  for (const round of BRACKET_ROUNDS) {
    byRound.set(round, []);
  }

  for (const game of filtered) {
    const winner = game.winner ?? (game.winnerTeamId ? teamById?.[game.winnerTeamId] : undefined);
    const loser = game.loser ?? (game.loserTeamId ? teamById?.[game.loserTeamId] : undefined);

    const teamA = toBracketTeam(winner, teamById);
    const teamB = toBracketTeam(loser, teamById);

    const bracketGame: BracketGame = {
      id: game.id,
      round: game.round,
      gameNo: game.gameNo,
      teamA,
      teamB,
      winnerTeamId: game.winnerTeamId || null,
    };

    const list = byRound.get(game.round);
    if (list) list.push(bracketGame);
  }

  for (const list of byRound.values()) {
    list.sort((a, b) => a.gameNo - b.gameNo);
  }

  const rounds: BracketRound[] = BRACKET_ROUNDS.map((round) => ({
    round,
    label: ROUND_LABELS[round],
    games: byRound.get(round) ?? [],
  }));

  return { rounds };
}
