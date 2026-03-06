import type { BracketGame } from "./types";

type GameCardProps = {
  game: BracketGame;
};

export function GameCard({ game }: GameCardProps) {
  return (
    <div className="game-card" data-game-id={game.id}>
      {game.teamA?.name ?? "TBD"} vs {game.teamB?.name ?? "TBD"}
    </div>
  );
}
