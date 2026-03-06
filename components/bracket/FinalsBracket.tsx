import type { BracketGame } from "./types";

type FinalsBracketProps = {
  games: BracketGame[];
};

export function FinalsBracket({ games }: FinalsBracketProps) {
  if (games.length === 0) return null;
  return <div className="finals-bracket" data-games={games.length} />;
}
