import type { BracketGame, BracketRegion } from "./types";

type RegionBracketProps = {
  region: BracketRegion;
  games: BracketGame[];
};

export function RegionBracket({ region, games }: RegionBracketProps) {
  const regionGames = games.filter((g) => g.region === region);
  return (
    <div className="region-bracket" data-region={region} data-games={regionGames.length}>
      <h3 className="text-xs font-medium text-white/60">{region}</h3>
    </div>
  );
}
