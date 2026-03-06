import { useMemo, useState } from "react";
import { GameCard } from "./GameCard";
import {
  BracketGame,
  BracketRound,
  BracketRegion,
  FINALS_ROUNDS,
  REGIONS,
  REGION_ROUNDS,
  ROUND_LABEL,
} from "./types";
import { sortBySlot } from "./utils";

type MobileBracketProps = {
  games: BracketGame[];
};

type TopTab = BracketRegion | "FinalFour";

const REGION_ROUND_TABS: BracketRound[] = ["R64", "R32", "S16", "E8"];

export function MobileBracket({ games }: MobileBracketProps) {
  const [selectedTab, setSelectedTab] = useState<TopTab>("West");
  const [selectedRound, setSelectedRound] = useState<BracketRound>("R64");

  const isFinalFourTab = selectedTab === "FinalFour";

  const regionGames = useMemo(() => {
    if (isFinalFourTab) return [] as BracketGame[];
    return games.filter(
      (g) =>
        g.region === selectedTab &&
        REGION_ROUNDS.includes(g.round) &&
        g.round === selectedRound,
    );
  }, [games, isFinalFourTab, selectedTab, selectedRound]);

  const finalsGames = useMemo(
    () => games.filter((g) => g.region === "FinalFour"),
    [games],
  );

  const sortedRegionGames = useMemo(
    () => sortBySlot(regionGames),
    [regionGames],
  );

  const finalFourGames = useMemo(
    () =>
      sortBySlot(
        finalsGames.filter((g) => g.round === "F4"),
      ),
    [finalsGames],
  );

  const championshipGames = useMemo(
    () =>
      sortBySlot(
        finalsGames.filter((g) => g.round === "NCG"),
      ),
    [finalsGames],
  );

  const handleSelectTab = (tab: TopTab) => {
    setSelectedTab(tab);
    if (tab !== "FinalFour" && !REGION_ROUND_TABS.includes(selectedRound)) {
      setSelectedRound("R64");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 space-y-0">
        <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-4 pb-2 pt-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-white/80">Bracket</div>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {[...REGIONS, "FinalFour" as TopTab].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleSelectTab(tab)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                  selectedTab === tab
                    ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                    : "border border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {tab === "FinalFour" ? "Final Four" : tab}
              </button>
            ))}
          </div>
        </div>

        {!isFinalFourTab && (
          <div className="sticky top-14 z-20 border-b border-white/10 bg-slate-950/90 px-4 pb-2 pt-1 backdrop-blur">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {REGION_ROUND_TABS.map((round) => (
                <button
                  key={round}
                  type="button"
                  onClick={() => setSelectedRound(round)}
                  className={`whitespace-nowrap rounded-full px-3 py-0.5 text-[11px] ${
                    selectedRound === round
                      ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                      : "border border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {ROUND_LABEL[round]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-1">
        {!isFinalFourTab ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">
              {ROUND_LABEL[selectedRound]} — {selectedTab}
            </h3>
            <p className="text-[11px] text-white/60">
              {sortedRegionGames.length}{" "}
              {sortedRegionGames.length === 1 ? "game" : "games"} • Winners
              highlighted
            </p>
            {sortedRegionGames.length === 0 ? (
              <p className="text-xs text-white/60">
                No games for this round yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {sortedRegionGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white/80">
                {ROUND_LABEL["F4"]}
              </h3>
              {finalFourGames.length === 0 ? (
                <p className="text-xs text-white/60">
                  No Final Four games yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {finalFourGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white/80">
                {ROUND_LABEL["NCG"]}
              </h3>
              {championshipGames.length === 0 ? (
                <p className="text-xs text-white/60">
                  No Championship game yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {championshipGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

