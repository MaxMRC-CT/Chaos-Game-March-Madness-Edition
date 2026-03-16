export type LiveAdminGameCard = {
  slotId: string;
  round: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL";
  roundLabel: string;
  gameNo: number;
  region: string;
  bracketLabel: string;
  status: "pending" | "completed";
  isPlayInRelated: boolean;
  teamA: {
    id: string;
    name: string;
    shortName: string | null;
    seed: number;
    region: string;
  };
  teamB: {
    id: string;
    name: string;
    shortName: string | null;
    seed: number;
    region: string;
  };
  winnerTeamId: string | null;
  updatedAt: string | null;
};

export type LiveAdminConsoleData = {
  league: {
    id: string;
    code: string;
    name: string;
    status: string;
    year: number;
  };
  summary: {
    currentRound: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL";
    currentRoundLabel: string;
    pendingCount: number;
    completedCount: number;
    lastUpdatedAt: string | null;
    standingsUpdatedAt: string | null;
  };
  queue: Array<{
    round: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL";
    roundLabel: string;
    games: LiveAdminGameCard[];
  }>;
  recentlyUpdated: Array<{
    slotId: string;
    matchup: string;
    winnerName: string;
    loserName: string;
    updatedAt: string | null;
    roundLabel: string;
  }>;
  audit: {
    totalCompletedGames: number;
    totalPendingGames: number;
    lastUpdatedGame: string | null;
    roundHealthOk: boolean;
    roundHealthError: string | null;
    standingsUpToDate: boolean;
  };
};
