export type BracketRound = "R64" | "R32" | "S16" | "E8" | "F4" | "NCG";

export type BracketRegion = "West" | "East" | "South" | "Midwest";

export type BracketTeam = {
  id: string;
  name: string;
  seed: number;
};

export type BracketGame = {
  id: string;
  round: BracketRound;
  region: BracketRegion | "FinalFour";
  slot: number;
  teamA?: BracketTeam;
  teamB?: BracketTeam;
  winnerTeamId?: string | null;
};

export const REGIONS: BracketRegion[] = ["West", "East", "South", "Midwest"];

export const REGION_ROUNDS: BracketRound[] = ["R64", "R32", "S16", "E8"];

export const FINALS_ROUNDS: BracketRound[] = ["F4", "NCG"];

export const ROUND_LABEL: Record<BracketRound, string> = {
  R64: "Round of 64",
  R32: "Round of 32",
  S16: "Sweet 16",
  E8: "Elite 8",
  F4: "Final Four",
  NCG: "Championship",
};

