export type WarRoomResponse = {
  league: {
    id: string;
    name: string;
    status: "SETUP" | "LOCKED" | "DRAFT" | "LIVE" | "COMPLETE";
    lockDeadline?: string | null;
    firstTipOff?: string | null;
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
      teamAOwnership?: { heroPct: number; villainPct: number; cinderellaPct: number };
      teamBOwnership?: { heroPct: number; villainPct: number; cinderellaPct: number };
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
  ownershipByRole: Record<
    string,
    { heroPct: number; villainPct: number; cinderellaPct: number }
  >;
  myLeagueAnalytics?: {
    mostUniquePick: { teamId: string; teamName: string; role: string; ownershipPct: number } | null;
    chalkiestPick: { teamId: string; teamName: string; role: string; ownershipPct: number } | null;
    biggestVillainHit: { teamId: string; teamName: string; points: number } | null;
    bestCinderellaPerformer: { teamId: string; teamName: string; points: number } | null;
    scoreByRole: { hero: number; villain: number; cinderella: number; total: number };
    pickLeveragePerPick?: Array<{
      teamId: string;
      role: string;
      teamName: string;
      points: number;
      leverage: number;
      ownershipPct: number;
    }>;
    chaosIndex?: number;
    projectionPreviews?: Array<{
      teamId: string;
      teamName: string;
      role: string;
      currentPoints: number;
      nextRoundPoints: number;
      pointsDelta: number;
      avgOwnershipPct: number;
      youSwing: number;
      leagueSwing: number;
      netSwing: number;
    }>;
    pickLeverage?: {
      portfolioLeverage: number;
      highestLeverageHit: {
        teamId: string;
        teamName: string;
        role: string;
        points: number;
        leverage: number;
        ownershipPct: number;
      } | null;
      mostValuableContrarianHit: {
        teamId: string;
        teamName: string;
        role: string;
        points: number;
        ownershipPct: number;
      } | null;
    };
    identity?: {
      fieldAlignment: number;
      upsideVsField: number;
      riskProfile: number;
      antiChalkExposure: number;
      upsetDependency: number;
      archetype: { name: string; explanation: string };
    };
  };
  momentumSummaries?: {
    biggestJump: { memberId: string; displayName: string; spots: number; delta: number } | null;
    momentumLeader: { memberId: string; displayName: string; total: number } | null;
    leaderUnderPressure: boolean;
    chaosSpike: { memberId: string; displayName: string; label: string } | null;
  };
  /** v2.3 League-wide top 5 leverage picks */
  top5LeveragePicks?: Array<{
    teamId: string;
    teamName: string;
    role: string;
    points: number;
    leverage: number;
    ownershipPct: number;
    memberDisplayName?: string;
  }>;
  /** v2.3 Upset exposure summary */
  upsetExposure?: {
    totalCinderellaExposurePct: number;
    totalVillainExposurePct: number;
    highSeedRiskSummary: {
      heroExposurePct: number;
      villainExposurePct: number;
      cinderellaExposurePct: number;
      highSeedTeamCount: number;
    };
  };
  /** v2.4 Round summary when LIVE and round just applied */
  roundSummary?: {
    chaosSpike: { memberId: string; displayName: string; spots: number } | null;
    villainShockwave: { teamName: string; heroPct: number } | null;
    chalkCollapse: { teamName: string; heroPct: number } | null;
    leverageLeader: { memberId: string; displayName: string; chaosIndex: number } | null;
  };
  /** v2.3 Standings with chaosIndex and portfolioLeverage for toggle sorting */
  standingsWithLeverage?: Array<{
    memberId: string;
    displayName: string;
    total: number;
    HERO?: number;
    VILLAIN?: number;
    CINDERELLA?: number;
    rivalry?: number;
    championshipPrediction?: number | null;
    chaosIndex: number;
    portfolioLeverage: number;
  }>;
  /** Present only when ENV_NAME=development */
  roundCounts?: { R64: number; R32: number; S16: number; E8: number; F4: number; NCG: number };

  /** Rivalry layer: strategic intel per viewer (when me is set) */
  rivalryPanel?: {
    closestRival: RivalryInsight | null;
    strategicCollision: RivalryInsight | null;
    directConflict: RivalryInsight | null;
    biggestThreat: RivalryInsight | null;
    mostOpposed: RivalryInsight | null;
  };
  /** Contrarian labels by memberId. Sparse: only members with a label. */
  contrarianLabels?: Record<string, string>;
}

export type RivalryInsight = {
  type: string;
  label: string;
  memberId: string;
  displayName: string;
  detail: string;
  score: number;
};
