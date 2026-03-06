import type { BracketGame } from "./types";

export function sortBySlot(games: BracketGame[]): BracketGame[] {
  return [...games].sort((a, b) => a.slot - b.slot);
}
