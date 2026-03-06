export type WarRoomResponse = {
  league: {
    id: string;
    name: string;
    status: "SETUP" | "DRAFT" | "LIVE" | "COMPLETE";
    code: string;
    currentPick: number;
    currentRound: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL" | "CHAMP";
    tournamentYear?: { year: number };
  };
  bracketConfig?: { finalFourPairings: [string, string][] };
  me: {
    memberId: string;
    displayName: string;
    isAdmin: boolean;
    draftPosition: number | null;
    hasReconnectToken: boolean;
    championshipPrediction: number | null;
  } | null;
  members: Array<{
    id: string;
    displayName: string;
    isAdmin: boolean;
    draftPosition: number | null;
  }>;
  picks: Array<{
    id: string;
    role: "HERO" | "VILLAIN" | "CINDERELLA";
    pickNumber: number;
    memberId: string;
    teamId: string;
    createdAt: string;
    member: { displayName: string };
    team: { id: string; name: string; shortName: string | null; seed: number; region: string };
  }>;
  myPicks: Array<{
    id: string;
    role: "HERO" | "VILLAIN" | "CINDERELLA";
    pickNumber: number;
    memberId: string;
    teamId: string;
    createdAt: string;
    member: { displayName: string };
    team: { id: string; name: string; shortName: string | null; seed: number; region: string };
  }>;
  teams: Array<{ id: string; name: string; shortName: string | null; seed: number; region: string }>;
  teamResults: Array<{
    id: string;
    teamId: string;
    wins: number;
    eliminatedRound: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL" | "CHAMP" | null;
    updatedAt: string;
  }>;
  games: Array<{
    id: string;
    round: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL" | "CHAMP";
    gameNo: number;
    winnerTeamId: string;
    loserTeamId: string;
    createdAt: string;
    winner?: { id: string; name: string; seed: number; region: string };
    loser?: { id: string; name: string; seed: number; region: string };
  }>;
  standings: Array<{
    memberId: string;
    displayName: string;
    total: number;
    HERO?: number;
    VILLAIN?: number;
    CINDERELLA?: number;
    rivalry?: number;
    championshipPrediction?: number | null;
  }>;
  standingsDelta: Record<string, number>;
  standingsUpdatedAt: string | null;
  recentEvents: Array<{ id: string; type: string; payload: unknown; createdAt: string }>;
  highlightEvents: Array<{ id: string; type: string; payload: unknown; createdAt: string }>;
  hotSeatMatchups: Array<{
    id: string;
    round: "R64" | "R32" | "S16" | "E8" | "F4" | "FINAL" | "CHAMP";
    region: string;
    label: string;
    teamA: { id: string; name: string; shortName: string | null; seed: number; region: string };
    teamB: { id: string; name: string; shortName: string | null; seed: number; region: string };
    impact: {
      heroOwners: string[];
      villainOwners: string[];
      cinderellaOwners: string[];
    };
    potentialSwing: {
      ifTeamAWins: string;
      ifTeamBWins: string;
    };
  }>;
  ownershipMap: Record<
    string,
    Array<{
      role: "HERO" | "VILLAIN" | "CINDERELLA";
      ownerDisplayName: string;
      ownerMemberId: string;
    }>
  >;
  /** Present only when ENV_NAME=development */
  roundCounts?: { R64: number; R32: number; S16: number; E8: number; F4: number; NCG: number };
};
