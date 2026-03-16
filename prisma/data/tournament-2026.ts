export type Region = "East" | "West" | "South" | "Midwest";

export type TournamentTeamInput = {
  name: string;
  seed: number;
  region: Region;
  shortName?: string;
};

export type FirstFourMatchup = {
  slotName: string;
  seed: number;
  region: Region;
  teams: [string, string];
};

export type FirstRoundMatchup = {
  region: Region;
  seedA: number;
  teamA: string;
  seedB: number;
  teamB: string;
};

// The current schema and bracket/admin loaders model one seeded slot per region.
// We therefore represent First Four slots as composite play-in placeholders.
export const FIRST_FOUR_2026: FirstFourMatchup[] = [
  {
    slotName: "NC State / Texas",
    seed: 11,
    region: "West",
    teams: ["NC State", "Texas"],
  },
  {
    slotName: "Lehigh / Prairie View A&M",
    seed: 16,
    region: "South",
    teams: ["Lehigh", "Prairie View A&M"],
  },
  {
    slotName: "Howard / UMBC",
    seed: 16,
    region: "Midwest",
    teams: ["Howard", "UMBC"],
  },
  {
    slotName: "SMU / Miami (Ohio)",
    seed: 11,
    region: "Midwest",
    teams: ["SMU", "Miami (Ohio)"],
  },
] as const;

export const TEAMS_2026: TournamentTeamInput[] = [
  { name: "Duke", seed: 1, region: "East" },
  { name: "Siena", seed: 16, region: "East" },
  { name: "Ohio State", seed: 8, region: "East" },
  { name: "TCU", seed: 9, region: "East" },
  { name: "St. John's", seed: 5, region: "East" },
  { name: "Northern Iowa", seed: 12, region: "East" },
  { name: "Kansas", seed: 4, region: "East" },
  { name: "Cal Baptist", seed: 13, region: "East" },
  { name: "Louisville", seed: 6, region: "East" },
  { name: "South Florida", seed: 11, region: "East" },
  { name: "Michigan State", seed: 3, region: "East" },
  { name: "North Dakota State", seed: 14, region: "East" },
  { name: "UCLA", seed: 7, region: "East" },
  { name: "UCF", seed: 10, region: "East" },
  { name: "UConn", seed: 2, region: "East" },
  { name: "Furman", seed: 15, region: "East" },

  { name: "Arizona", seed: 1, region: "West" },
  { name: "Long Island", seed: 16, region: "West" },
  { name: "Villanova", seed: 8, region: "West" },
  { name: "Utah State", seed: 9, region: "West" },
  { name: "Wisconsin", seed: 5, region: "West" },
  { name: "High Point", seed: 12, region: "West" },
  { name: "Arkansas", seed: 4, region: "West" },
  { name: "Hawaii", seed: 13, region: "West" },
  { name: "BYU", seed: 6, region: "West" },
  { name: "NC State / Texas", seed: 11, region: "West", shortName: "NC State / Texas" },
  { name: "Gonzaga", seed: 3, region: "West" },
  { name: "Kennesaw State", seed: 14, region: "West" },
  { name: "Miami (FL)", seed: 7, region: "West" },
  { name: "Missouri", seed: 10, region: "West" },
  { name: "Purdue", seed: 2, region: "West" },
  { name: "Queens (N.C.)", seed: 15, region: "West", shortName: "Queens" },

  { name: "Florida", seed: 1, region: "South" },
  {
    name: "Lehigh / Prairie View A&M",
    seed: 16,
    region: "South",
    shortName: "Lehigh / PVAMU",
  },
  { name: "Clemson", seed: 8, region: "South" },
  { name: "Iowa", seed: 9, region: "South" },
  { name: "Vanderbilt", seed: 5, region: "South" },
  { name: "McNeese", seed: 12, region: "South" },
  { name: "Nebraska", seed: 4, region: "South" },
  { name: "Troy", seed: 13, region: "South" },
  { name: "North Carolina", seed: 6, region: "South" },
  { name: "VCU", seed: 11, region: "South" },
  { name: "Illinois", seed: 3, region: "South" },
  { name: "Penn", seed: 14, region: "South" },
  { name: "Saint Mary's", seed: 7, region: "South", shortName: "Saint Mary's" },
  { name: "Texas A&M", seed: 10, region: "South" },
  { name: "Houston", seed: 2, region: "South" },
  { name: "Idaho", seed: 15, region: "South" },

  { name: "Michigan", seed: 1, region: "Midwest" },
  { name: "Howard / UMBC", seed: 16, region: "Midwest", shortName: "Howard / UMBC" },
  { name: "Georgia", seed: 8, region: "Midwest" },
  { name: "Saint Louis", seed: 9, region: "Midwest", shortName: "Saint Louis" },
  { name: "Texas Tech", seed: 5, region: "Midwest" },
  { name: "Akron", seed: 12, region: "Midwest" },
  { name: "Alabama", seed: 4, region: "Midwest" },
  { name: "Hofstra", seed: 13, region: "Midwest" },
  { name: "Tennessee", seed: 6, region: "Midwest" },
  { name: "SMU / Miami (Ohio)", seed: 11, region: "Midwest", shortName: "SMU / Miami" },
  { name: "Virginia", seed: 3, region: "Midwest" },
  { name: "Wright State", seed: 14, region: "Midwest" },
  { name: "Kentucky", seed: 7, region: "Midwest" },
  { name: "Santa Clara", seed: 10, region: "Midwest" },
  { name: "Iowa State", seed: 2, region: "Midwest" },
  { name: "Tennessee State", seed: 15, region: "Midwest" },
] as const;

export const FIRST_ROUND_MATCHUPS_2026: FirstRoundMatchup[] = [
  { region: "East", seedA: 1, teamA: "Duke", seedB: 16, teamB: "Siena" },
  { region: "East", seedA: 8, teamA: "Ohio State", seedB: 9, teamB: "TCU" },
  { region: "East", seedA: 5, teamA: "St. John's", seedB: 12, teamB: "Northern Iowa" },
  { region: "East", seedA: 4, teamA: "Kansas", seedB: 13, teamB: "Cal Baptist" },
  { region: "East", seedA: 6, teamA: "Louisville", seedB: 11, teamB: "South Florida" },
  { region: "East", seedA: 3, teamA: "Michigan State", seedB: 14, teamB: "North Dakota State" },
  { region: "East", seedA: 7, teamA: "UCLA", seedB: 10, teamB: "UCF" },
  { region: "East", seedA: 2, teamA: "UConn", seedB: 15, teamB: "Furman" },

  { region: "West", seedA: 1, teamA: "Arizona", seedB: 16, teamB: "Long Island" },
  { region: "West", seedA: 8, teamA: "Villanova", seedB: 9, teamB: "Utah State" },
  { region: "West", seedA: 5, teamA: "Wisconsin", seedB: 12, teamB: "High Point" },
  { region: "West", seedA: 4, teamA: "Arkansas", seedB: 13, teamB: "Hawaii" },
  { region: "West", seedA: 6, teamA: "BYU", seedB: 11, teamB: "NC State / Texas" },
  { region: "West", seedA: 3, teamA: "Gonzaga", seedB: 14, teamB: "Kennesaw State" },
  { region: "West", seedA: 7, teamA: "Miami (FL)", seedB: 10, teamB: "Missouri" },
  { region: "West", seedA: 2, teamA: "Purdue", seedB: 15, teamB: "Queens (N.C.)" },

  {
    region: "South",
    seedA: 1,
    teamA: "Florida",
    seedB: 16,
    teamB: "Lehigh / Prairie View A&M",
  },
  { region: "South", seedA: 8, teamA: "Clemson", seedB: 9, teamB: "Iowa" },
  { region: "South", seedA: 5, teamA: "Vanderbilt", seedB: 12, teamB: "McNeese" },
  { region: "South", seedA: 4, teamA: "Nebraska", seedB: 13, teamB: "Troy" },
  { region: "South", seedA: 6, teamA: "North Carolina", seedB: 11, teamB: "VCU" },
  { region: "South", seedA: 3, teamA: "Illinois", seedB: 14, teamB: "Penn" },
  { region: "South", seedA: 7, teamA: "Saint Mary's", seedB: 10, teamB: "Texas A&M" },
  { region: "South", seedA: 2, teamA: "Houston", seedB: 15, teamB: "Idaho" },

  { region: "Midwest", seedA: 1, teamA: "Michigan", seedB: 16, teamB: "Howard / UMBC" },
  { region: "Midwest", seedA: 8, teamA: "Georgia", seedB: 9, teamB: "Saint Louis" },
  { region: "Midwest", seedA: 5, teamA: "Texas Tech", seedB: 12, teamB: "Akron" },
  { region: "Midwest", seedA: 4, teamA: "Alabama", seedB: 13, teamB: "Hofstra" },
  { region: "Midwest", seedA: 6, teamA: "Tennessee", seedB: 11, teamB: "SMU / Miami (Ohio)" },
  { region: "Midwest", seedA: 3, teamA: "Virginia", seedB: 14, teamB: "Wright State" },
  { region: "Midwest", seedA: 7, teamA: "Kentucky", seedB: 10, teamB: "Santa Clara" },
  { region: "Midwest", seedA: 2, teamA: "Iowa State", seedB: 15, teamB: "Tennessee State" },
] as const;
