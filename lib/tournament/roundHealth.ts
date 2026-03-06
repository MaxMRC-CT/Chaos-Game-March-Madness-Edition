import { Round } from "@prisma/client";
import { prisma } from "@/lib/db";

const ROUND_ORDER: Round[] = ["R64", "R32", "S16", "E8", "F4", "FINAL", "CHAMP"];
const EXPECTED_COUNTS: Record<string, number> = {
  R64: 32,
  R32: 16,
  S16: 8,
  E8: 4,
  F4: 2,
  FINAL: 1,
  CHAMP: 1,
};

export type RoundHealthRow = {
  round: string;
  expected: number;
  gamesExist: number;
  gamesReady: number;
  gamesDecided: number;
  broken: number;
  brokenExamples: Array<{ gameId: string; gameNo: number; missing: string[] }>;
};

export type RoundHealthResult = {
  leagueId: string;
  ok: boolean;
  error?: string;
  rounds: RoundHealthRow[];
  championTeamId: string | null;
};

/**
 * Returns per-round health stats for a league's tournament games.
 * Uses leagueId because TournamentGame is league-scoped.
 * Progression must NOT filter by drafted teams - this reads all games for the league.
 */
export async function getRoundHealth(leagueId: string): Promise<RoundHealthResult> {
  const rounds: RoundHealthRow[] = [];
  let championTeamId: string | null = null;

  const games = await prisma.tournamentGame.findMany({
    where: { leagueId },
    select: {
      id: true,
      round: true,
      gameNo: true,
      winnerTeamId: true,
      loserTeamId: true,
    },
    orderBy: [{ round: "asc" }, { gameNo: "asc" }],
  });

  const gamesByRound = new Map<string, typeof games>();
  for (const g of games) {
    const list = gamesByRound.get(g.round) ?? [];
    list.push(g);
    gamesByRound.set(g.round, list);
  }

  for (const round of ROUND_ORDER) {
    const expected = EXPECTED_COUNTS[round] ?? 0;
    const roundGames = gamesByRound.get(round) ?? [];
    const gamesExist = roundGames.length;
    let gamesReady = 0;
    let gamesDecided = 0;
    const brokenExamples: RoundHealthRow["brokenExamples"] = [];

    for (const g of roundGames) {
      const hasWinner = Boolean(g.winnerTeamId);
      const hasLoser = Boolean(g.loserTeamId);
      const ready = hasWinner && hasLoser;
      const decided = ready;
      if (ready) gamesReady++;
      if (decided) gamesDecided++;

      const missing: string[] = [];
      if (!hasWinner) missing.push("winnerTeamId");
      if (!hasLoser) missing.push("loserTeamId");
      if (missing.length > 0) {
        brokenExamples.push({ gameId: g.id, gameNo: g.gameNo, missing });
      }
    }
    const broken = roundGames.length - gamesReady;

    rounds.push({
      round,
      expected,
      gamesExist,
      gamesReady,
      gamesDecided,
      broken,
      brokenExamples: brokenExamples.slice(0, 3),
    });

    if (round === "FINAL" && roundGames.length > 0) {
      const champGame = roundGames[roundGames.length - 1];
      if (champGame.winnerTeamId) championTeamId = champGame.winnerTeamId;
    }
    if (round === "CHAMP" && !championTeamId && roundGames.length > 0) {
      const champGame = roundGames[roundGames.length - 1];
      if (champGame.winnerTeamId) championTeamId = champGame.winnerTeamId;
    }
  }

  const finalGames = rounds.find((r) => r.round === "FINAL")?.gamesExist ?? 0;
  const champGames = rounds.find((r) => r.round === "CHAMP")?.gamesExist ?? 0;
  const championshipSatisfied = finalGames >= 1 || champGames >= 1;
  const missingRounds = rounds.filter((r) => {
    if (r.expected === 0 || r.gamesExist > 0) return false;
    if ((r.round === "FINAL" || r.round === "CHAMP") && championshipSatisfied) return false;
    return true;
  });
  const ok = missingRounds.length === 0;
  let error: string | undefined;
  if (!ok && missingRounds.length > 0) {
    error = `Missing games for rounds: ${missingRounds.map((r) => r.round).join(", ")}. Expected ${missingRounds.map((r) => r.expected).join(", ")} respectively.`;
  }

  return {
    leagueId,
    ok,
    error,
    rounds,
    championTeamId,
  };
}

/**
 * Log round health to console (for dev pipeline).
 */
export function logRoundHealth(result: RoundHealthResult): void {
  console.log("[roundHealth]", JSON.stringify(result, null, 2));
  if (result.error) {
    console.error("[roundHealth] ERROR:", result.error);
  }
}
