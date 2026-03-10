/**
 * ESPN-style NCAA bracket layout model.
 * Deterministic structure: left/right mirrored per region, meeting in the middle.
 * Uses team seed + region from teams, TournamentGame results for winners.
 */

export const REGIONS = ["East", "West", "South", "Midwest"] as const;
export type Region = (typeof REGIONS)[number];

/** NCAA standard R64 matchup order per region */
export const NCAA_R64_MATCHUPS: [number, number][] = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

/** Map seed pair (min,max) to our R64 slot index 0-7 */
const SEED_PAIR_TO_SLOT = new Map<string, number>();
for (let i = 0; i < NCAA_R64_MATCHUPS.length; i++) {
  const [a, b] = NCAA_R64_MATCHUPS[i];
  SEED_PAIR_TO_SLOT.set(`${Math.min(a, b)},${Math.max(a, b)}`, i);
}

function slotForSeedPair(seedA: number, seedB: number): number {
  const key = `${Math.min(seedA, seedB)},${Math.max(seedA, seedB)}`;
  return SEED_PAIR_TO_SLOT.get(key) ?? -1;
}

/**
 * Simulator uses (1v16, 2v15, 3v14, 4v13, 5v12, 6v11, 7v10, 8v9) = sim indices 0-7.
 * We use NCAA order: (1v16), (8v9), (5v12), (4v13), (6v11), (3v14), (7v10), (2v15).
 */
const SIM_INDEX_TO_NCAA_SLOT = [0, 7, 5, 3, 2, 4, 6, 1];

/** R64 gameNo ranges per region (1-based). East 1-8, West 9-16, South 17-24, Midwest 25-32. */
export const R64_REGION_GAME_RANGES: Record<Region, [number, number]> = {
  East: [1, 8],
  West: [9, 16],
  South: [17, 24],
  Midwest: [25, 32],
};

/** R32/S16/E8 gameNo ranges per region (1-based) */
export const REGION_GAME_RANGES = {
  R32: { East: [1, 4], West: [5, 8], South: [9, 12], Midwest: [13, 16] },
  S16: { East: [1, 2], West: [3, 4], South: [5, 6], Midwest: [7, 8] },
  E8: { East: [1, 1], West: [2, 2], South: [3, 3], Midwest: [4, 4] },
} as const;

export type TeamLite = {
  id: string;
  name: string;
  shortName?: string | null;
  seed: number;
  region: string;
};

export type GameInput = {
  id: string;
  round: string;
  gameNo: number;
  winnerTeamId: string;
  loserTeamId: string;
  winner?: TeamLite | null;
  loser?: TeamLite | null;
};

export type BracketTeam = {
  id: string;
  seed: number;
  name: string;
};

export type MatchupNode = {
  id: string;
  region: Region | "F4";
  round: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL";
  side: "left" | "right" | "center";
  slotIndex: number;
  teamA: BracketTeam;
  teamB: BracketTeam;
  winnerTeamId: string | null;
  gameId: string | null;
};

export type Connector = {
  fromId: string;
  toId: string;
};

export type RegionBracket = {
  region: Region;
  nodes: MatchupNode[];
  connectors: Connector[];
};

export type FinalFourBracket = {
  nodes: MatchupNode[];
  connectors: Connector[];
};

export type EspnLayoutData = {
  regions: RegionBracket[];
  finalFour: FinalFourBracket;
};

function toBracketTeam(
  team: TeamLite | null | undefined,
  fallback: { id: string; seed: number; name: string }
): BracketTeam {
  if (!team) return fallback;
  return {
    id: team.id,
    seed: team.seed,
    name: team.shortName || team.name || fallback.name,
  };
}

function tbd(seed?: number): BracketTeam {
  return { id: "tbd", seed: seed ?? 0, name: "TBD" };
}

/** Default Final Four pairings when no config is provided */
const DEFAULT_FINAL_FOUR_PAIRINGS: [string, string][] = [
  ["East", "West"],
  ["South", "Midwest"],
];

/**
 * Build the full ESPN-style bracket layout from teams and games.
 * @param pairings - Optional Final Four pairings, e.g. [["East","West"],["South","Midwest"]].
 *   If omitted, uses the default.
 */
export function buildEspnLayout(
  teams: TeamLite[],
  games: GameInput[],
  pairings: [string, string][] = DEFAULT_FINAL_FOUR_PAIRINGS
): EspnLayoutData {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamsByRegion = new Map<Region, TeamLite[]>();
  for (const r of REGIONS) {
    teamsByRegion.set(
      r,
      teams
        .filter((t) => t.region === r)
        .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name))
    );
  }

  const gamesByRound = new Map<string, GameInput[]>();
  for (const g of games) {
    if (!["R64", "R32", "S16", "E8", "F4", "FINAL"].includes(g.round)) continue;
    const list = gamesByRound.get(g.round) ?? [];
    list.push(g);
    gamesByRound.set(g.round, list);
  }
  for (const list of gamesByRound.values()) {
    list.sort((a, b) => a.gameNo - b.gameNo);
  }

  const r64Games = gamesByRound.get("R64") ?? [];
  const r32Games = gamesByRound.get("R32") ?? [];
  const s16Games = gamesByRound.get("S16") ?? [];
  const e8Games = gamesByRound.get("E8") ?? [];
  const f4Games = gamesByRound.get("F4") ?? [];
  const finalGames = gamesByRound.get("FINAL") ?? [];

  const regions: RegionBracket[] = [];

  for (let ri = 0; ri < REGIONS.length; ri++) {
    const region = REGIONS[ri];
    const regionTeams = teamsByRegion.get(region) ?? [];
    const teamBySeed = new Map(regionTeams.map((t) => [t.seed, t]));

    const nodes: MatchupNode[] = [];
    const connectors: Connector[] = [];

    const makeId = (r: string, s: string, i: number) => `${r}-${s}-${i}`;

    // Left side: R64 slots 0-3, R32 slots 0-1, S16 slot 0
    const leftR64Slots = [0, 1, 2, 3];
    const leftR32Slots = [0, 1];
    const leftS16Slot = 0;

    // Right side: R64 slots 4-7, R32 slots 2-3, S16 slot 1
    const rightR64Slots = [4, 5, 6, 7];
    const rightR32Slots = [2, 3];
    const rightS16Slot = 1;

    // Fill R64 left
    for (const slot of leftR64Slots) {
      const [seedA, seedB] = NCAA_R64_MATCHUPS[slot];
      const teamA = teamBySeed.get(seedA);
      const teamB = teamBySeed.get(seedB);
      let winnerId: string | null = null;
      let gameId: string | null = null;

      for (const g of r64Games) {
        const w = g.winner ?? (g.winnerTeamId ? teamById.get(g.winnerTeamId) : undefined);
        const l = g.loser ?? (g.loserTeamId ? teamById.get(g.loserTeamId) : undefined);
        if (!w || !l || w.region !== region) continue;
        const pairSlot = slotForSeedPair(w.seed, l.seed);
        if (pairSlot === slot) {
          winnerId = g.winnerTeamId;
          gameId = g.id;
          break;
        }
      }

      const node: MatchupNode = {
        id: makeId(region, "R64-L", slot),
        region,
        round: "R64",
        side: "left",
        slotIndex: slot,
        teamA: toBracketTeam(teamA, tbd(seedA)),
        teamB: toBracketTeam(teamB, tbd(seedB)),
        winnerTeamId: winnerId,
        gameId,
      };
      nodes.push(node);
    }

    // Fill R64 right
    for (const slot of rightR64Slots) {
      const [seedA, seedB] = NCAA_R64_MATCHUPS[slot];
      const teamA = teamBySeed.get(seedA);
      const teamB = teamBySeed.get(seedB);
      let winnerId: string | null = null;
      let gameId: string | null = null;

      for (const g of r64Games) {
        const w = g.winner ?? (g.winnerTeamId ? teamById.get(g.winnerTeamId) : undefined);
        const l = g.loser ?? (g.loserTeamId ? teamById.get(g.loserTeamId) : undefined);
        if (!w || !l || w.region !== region) continue;
        const pairSlot = slotForSeedPair(w.seed, l.seed);
        if (pairSlot === slot) {
          winnerId = g.winnerTeamId;
          gameId = g.id;
          break;
        }
      }

      const node: MatchupNode = {
        id: makeId(region, "R64-R", slot),
        region,
        round: "R64",
        side: "right",
        slotIndex: slot,
        teamA: toBracketTeam(teamA, tbd(seedA)),
        teamB: toBracketTeam(teamB, tbd(seedB)),
        winnerTeamId: winnerId,
        gameId,
      };
      nodes.push(node);
    }

    // R32, S16, E8 - use games. Region games for R32/S16/E8: gameNo ordering
    // R32: 16 games. East 1-4, West 5-8, South 9-12, Midwest 13-16
    // S16: 8 games. East 1-2, West 3-4, South 5-6, Midwest 7-8
    // E8: 4 games. East 1, West 2, South 3, Midwest 4

    const [r32Lo, r32Hi] = REGION_GAME_RANGES.R32[region];
    const [s16Lo, s16Hi] = REGION_GAME_RANGES.S16[region];
    const [e8Lo, e8Hi] = REGION_GAME_RANGES.E8[region];
    const r32ForRegion = r32Games
      .filter((g) => g.gameNo >= r32Lo && g.gameNo <= r32Hi)
      .sort((a, b) => a.gameNo - b.gameNo);
    const s16ForRegion = s16Games
      .filter((g) => g.gameNo >= s16Lo && g.gameNo <= s16Hi)
      .sort((a, b) => a.gameNo - b.gameNo);
    const e8ForRegion = e8Games
      .filter((g) => g.gameNo >= e8Lo && g.gameNo <= e8Hi)
      .sort((a, b) => a.gameNo - b.gameNo);

    // R32 left: games 0,1 (feed from R64 slots 0,1 and 2,3)
    for (let i = 0; i < 2; i++) {
      const g = r32ForRegion[i];
      const slot = leftR32Slots[i];
      const id = makeId(region, "R32-L", slot);
      if (g) {
        const wa = g.winner ?? teamById.get(g.winnerTeamId);
        const la = g.loser ?? teamById.get(g.loserTeamId);
        nodes.push({
          id,
          region,
          round: "R32",
          side: "left",
          slotIndex: slot,
          teamA: toBracketTeam(wa, tbd()),
          teamB: toBracketTeam(la, tbd()),
          winnerTeamId: g.winnerTeamId,
          gameId: g.id,
        });
        const from1 = makeId(region, "R64-L", leftR64Slots[i * 2]);
        const from2 = makeId(region, "R64-L", leftR64Slots[i * 2 + 1]);
        connectors.push({ fromId: from1, toId: id }, { fromId: from2, toId: id });
      } else {
        nodes.push({
          id,
          region,
          round: "R32",
          side: "left",
          slotIndex: slot,
          teamA: tbd(),
          teamB: tbd(),
          winnerTeamId: null,
          gameId: null,
        });
        const from1 = makeId(region, "R64-L", leftR64Slots[i * 2]);
        const from2 = makeId(region, "R64-L", leftR64Slots[i * 2 + 1]);
        connectors.push({ fromId: from1, toId: id }, { fromId: from2, toId: id });
      }
    }

    // R32 right
    for (let i = 0; i < 2; i++) {
      const g = r32ForRegion[i + 2];
      const slot = rightR32Slots[i];
      const id = makeId(region, "R32-R", slot);
      if (g) {
        const wa = g.winner ?? teamById.get(g.winnerTeamId);
        const la = g.loser ?? teamById.get(g.loserTeamId);
        nodes.push({
          id,
          region,
          round: "R32",
          side: "right",
          slotIndex: slot,
          teamA: toBracketTeam(wa, tbd()),
          teamB: toBracketTeam(la, tbd()),
          winnerTeamId: g.winnerTeamId,
          gameId: g.id,
        });
      } else {
        nodes.push({
          id,
          region,
          round: "R32",
          side: "right",
          slotIndex: slot,
          teamA: tbd(),
          teamB: tbd(),
          winnerTeamId: null,
          gameId: null,
        });
      }
      const from1 = makeId(region, "R64-R", rightR64Slots[i * 2]);
      const from2 = makeId(region, "R64-R", rightR64Slots[i * 2 + 1]);
      connectors.push({ fromId: from1, toId: id }, { fromId: from2, toId: id });
    }

    // S16 left: 1 game, feeds from R32 left 0 and 1
    const s16LeftId = makeId(region, "S16-L", 0);
    const s16LeftGame = s16ForRegion[0];
    nodes.push({
      id: s16LeftId,
      region,
      round: "S16",
      side: "left",
      slotIndex: 0,
      teamA: s16LeftGame
        ? toBracketTeam(
            s16LeftGame.winner ?? teamById.get(s16LeftGame.winnerTeamId),
            tbd()
          )
        : tbd(),
      teamB: s16LeftGame
        ? toBracketTeam(
            s16LeftGame.loser ?? teamById.get(s16LeftGame.loserTeamId),
            tbd()
          )
        : tbd(),
      winnerTeamId: s16LeftGame?.winnerTeamId ?? null,
      gameId: s16LeftGame?.id ?? null,
    });
    connectors.push(
      { fromId: makeId(region, "R32-L", 0), toId: s16LeftId },
      { fromId: makeId(region, "R32-L", 1), toId: s16LeftId }
    );

    // S16 right
    const s16RightId = makeId(region, "S16-R", 1);
    const s16RightGame = s16ForRegion[1];
    nodes.push({
      id: s16RightId,
      region,
      round: "S16",
      side: "right",
      slotIndex: 1,
      teamA: s16RightGame
        ? toBracketTeam(
            s16RightGame.winner ?? teamById.get(s16RightGame.winnerTeamId),
            tbd()
          )
        : tbd(),
      teamB: s16RightGame
        ? toBracketTeam(
            s16RightGame.loser ?? teamById.get(s16RightGame.loserTeamId),
            tbd()
          )
        : tbd(),
      winnerTeamId: s16RightGame?.winnerTeamId ?? null,
      gameId: s16RightGame?.id ?? null,
    });
    connectors.push(
      { fromId: makeId(region, "R32-R", 2), toId: s16RightId },
      { fromId: makeId(region, "R32-R", 3), toId: s16RightId }
    );

    // E8 (regional final): center, feeds from S16 left and S16 right
    const e8Id = makeId(region, "E8", 0);
    const e8Game = e8ForRegion[0];
    nodes.push({
      id: e8Id,
      region,
      round: "E8",
      side: "center",
      slotIndex: 0,
      teamA: e8Game
        ? toBracketTeam(
            e8Game.winner ?? teamById.get(e8Game.winnerTeamId),
            tbd()
          )
        : tbd(),
      teamB: e8Game
        ? toBracketTeam(
            e8Game.loser ?? teamById.get(e8Game.loserTeamId),
            tbd()
          )
        : tbd(),
      winnerTeamId: e8Game?.winnerTeamId ?? null,
      gameId: e8Game?.id ?? null,
    });
    connectors.push({ fromId: s16LeftId, toId: e8Id }, { fromId: s16RightId, toId: e8Id });

    regions.push({ region, nodes, connectors });
  }

  // Final Four: use pairings to map E8 champs to F4 slots
  const e8ByRegion = new Map<Region, MatchupNode>(
    regions.map((r) => [r.region, r.nodes.find((n) => n.round === "E8")!])
  );
  const leftPairing = pairings[0];
  const rightPairing = pairings[1];
  const leftChampA = e8ByRegion.get(leftPairing[0] as Region)!;
  const leftChampB = e8ByRegion.get(leftPairing[1] as Region)!;
  const rightChampA = e8ByRegion.get(rightPairing[0] as Region)!;
  const rightChampB = e8ByRegion.get(rightPairing[1] as Region)!;

  const f4LeftId = "F4-left";
  const f4RightId = "F4-right";
  const finalId = "FINAL-1";

  const f4LeftGame = f4Games[0];
  const f4RightGame = f4Games[1];
  const finalGame = finalGames[0];

  const finalFourNodes: MatchupNode[] = [
    {
      id: f4LeftId,
      region: "F4",
      round: "F4",
      side: "left",
      slotIndex: 0,
      teamA: f4LeftGame
        ? toBracketTeam(
            f4LeftGame.winner ?? teamById.get(f4LeftGame.winnerTeamId),
            tbd()
          )
        : tbd(),
      teamB: f4LeftGame
        ? toBracketTeam(
            f4LeftGame.loser ?? teamById.get(f4LeftGame.loserTeamId),
            tbd()
          )
        : tbd(),
      winnerTeamId: f4LeftGame?.winnerTeamId ?? null,
      gameId: f4LeftGame?.id ?? null,
    },
    {
      id: f4RightId,
      region: "F4",
      round: "F4",
      side: "right",
      slotIndex: 1,
      teamA: f4RightGame
        ? toBracketTeam(
            f4RightGame.winner ?? teamById.get(f4RightGame.winnerTeamId),
            tbd()
          )
        : tbd(),
      teamB: f4RightGame
        ? toBracketTeam(
            f4RightGame.loser ?? teamById.get(f4RightGame.loserTeamId),
            tbd()
          )
        : tbd(),
      winnerTeamId: f4RightGame?.winnerTeamId ?? null,
      gameId: f4RightGame?.id ?? null,
    },
    {
      id: finalId,
      region: "F4",
      round: "FINAL",
      side: "center",
      slotIndex: 0,
      teamA: finalGame
        ? toBracketTeam(
            finalGame.winner ?? teamById.get(finalGame.winnerTeamId),
            tbd()
          )
        : tbd(),
      teamB: finalGame
        ? toBracketTeam(
            finalGame.loser ?? teamById.get(finalGame.loserTeamId),
            tbd()
          )
        : tbd(),
      winnerTeamId: finalGame?.winnerTeamId ?? null,
      gameId: finalGame?.id ?? null,
    },
  ];

  const finalFourConnectors: Connector[] = [
    { fromId: leftChampA.id, toId: f4LeftId },
    { fromId: leftChampB.id, toId: f4LeftId },
    { fromId: rightChampA.id, toId: f4RightId },
    { fromId: rightChampB.id, toId: f4RightId },
    { fromId: f4LeftId, toId: finalId },
    { fromId: f4RightId, toId: finalId },
  ];

  // Populate F4/FINAL teams from E8 winners when games not played
  if (!f4LeftGame && leftChampA.winnerTeamId && leftChampB.winnerTeamId) {
    const teamA = teamById.get(leftChampA.winnerTeamId);
    const teamB = teamById.get(leftChampB.winnerTeamId);
    finalFourNodes[0].teamA = toBracketTeam(teamA, tbd());
    finalFourNodes[0].teamB = toBracketTeam(teamB, tbd());
  }
  if (!f4RightGame && rightChampA.winnerTeamId && rightChampB.winnerTeamId) {
    const teamA = teamById.get(rightChampA.winnerTeamId);
    const teamB = teamById.get(rightChampB.winnerTeamId);
    finalFourNodes[1].teamA = toBracketTeam(teamA, tbd());
    finalFourNodes[1].teamB = toBracketTeam(teamB, tbd());
  }
  if (!finalGame) {
    const f4LeftWinner = f4LeftGame?.winnerTeamId ?? finalFourNodes[0].winnerTeamId;
    const f4RightWinner = f4RightGame?.winnerTeamId ?? finalFourNodes[1].winnerTeamId;
    if (f4LeftWinner && f4RightWinner) {
      finalFourNodes[2].teamA = toBracketTeam(teamById.get(f4LeftWinner), tbd());
      finalFourNodes[2].teamB = toBracketTeam(teamById.get(f4RightWinner), tbd());
    }
  }

  return {
    regions,
    finalFour: { nodes: finalFourNodes, connectors: finalFourConnectors },
  };
}
