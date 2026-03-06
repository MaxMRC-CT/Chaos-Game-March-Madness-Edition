"use client";

import { useEffect, useState } from "react";
import type { BracketData, BracketGame } from "@/lib/bracket/shape";
import { BRACKET_ROUNDS, ROUND_LABELS } from "@/lib/bracket/shape";

/**
 * BracketBoard – ESPN-style bracket layout.
 *
 * Tweakable constants:
 *   - columnWidth: Fixed width per round column (px).
 *   - zoomRange: [min, max] zoom scale.
 *   - zoomStep: Increment per +/- click.
 *   - perRoundGap: Vertical gap between matchup cards per round (px).
 *   - cardHeight: Height of each team row in a matchup (px).
 *   - connectorWidth: Width of connector zone between columns (px).
 */
const COLUMN_WIDTH = 280;
const ZOOM_RANGE = [0.5, 1.2] as const;
const ZOOM_STEP = 0.1;
const CARD_HEIGHT = 28;
const CONNECTOR_WIDTH = 20;
const PER_ROUND_GAP: Record<string, number> = {
  R64: 4,
  R32: 12,
  S16: 24,
  E8: 48,
  F4: 96,
  FINAL: 192,
};

const DEFAULT_ZOOM_DESKTOP = 0.9;
const DEFAULT_ZOOM_MOBILE = 0.8;

type Props = {
  data: BracketData;
};

export function BracketBoard({ data }: Props) {
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM_DESKTOP);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setZoom(mq.matches ? DEFAULT_ZOOM_MOBILE : DEFAULT_ZOOM_DESKTOP);
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_RANGE[1], z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_RANGE[0], z - ZOOM_STEP));
  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="space-y-3">
      {/* Top bar: legend + zoom */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-500/50" />
          <span>Winner</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#1f2937] bg-[#0f1623] p-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_RANGE[0]}
            className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-[#1f2937] hover:text-neutral-200 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="min-w-[2.5rem] text-center text-xs text-neutral-400" aria-label="Zoom level">
            {zoomPct}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_RANGE[1]}
            className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-[#1f2937] hover:text-neutral-200 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {/* Mobile round selector */}
      <div className="flex overflow-x-auto pb-1 md:hidden">
        <div className="flex gap-1 rounded-lg border border-[#1f2937] bg-[#0f1623] p-1">
          {BRACKET_ROUNDS.map((round, idx) => (
            <button
              key={round}
              type="button"
              onClick={() => setSelectedRoundIndex(idx)}
              className={`shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                selectedRoundIndex === idx
                  ? "bg-[#1f2937] text-white"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {ROUND_LABELS[round]}
            </button>
          ))}
        </div>
      </div>

      {/* Bracket container: scroll-snap + zoom */}
      <div
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl border border-[#1f2937] bg-[#111827] snap-x snap-mandatory"
        style={{ maxHeight: "min(70vh, 720px)" }}
      >
        <div
          className="inline-flex origin-top-left p-4"
          style={{ transform: `scale(${zoom})`, minWidth: "fit-content" }}
        >
          <div className="flex min-h-[320px] gap-0">
            {data.rounds.map((roundData, roundIdx) => {
              const isVisibleMobile =
                roundIdx === selectedRoundIndex || roundIdx === selectedRoundIndex + 1;
              const gap = PER_ROUND_GAP[roundData.round] ?? 12;

              return (
                <div
                  key={roundData.round}
                  className={`flex shrink-0 flex-col snap-start md:flex ${!isVisibleMobile ? "hidden md:flex" : ""}`}
                  style={{ width: COLUMN_WIDTH + CONNECTOR_WIDTH }}
                >
                  {/* Sticky round header */}
                  <div className="sticky top-0 z-10 -mx-px -mt-px mb-2 flex h-8 shrink-0 items-center justify-center rounded-t border border-[#1f2937] bg-[#111827] px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {roundData.label}
                  </div>
                  <div
                    className="flex flex-1 flex-col justify-between"
                    style={{ gap }}
                  >
                    {roundData.games.map((game) => (
                      <MatchupCardWithConnector
                        key={game.id}
                        game={game}
                        roundIndex={roundIdx}
                        totalRounds={data.rounds.length}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchupCardWithConnector({
  game,
  roundIndex,
  totalRounds,
}: {
  game: BracketGame;
  roundIndex: number;
  totalRounds: number;
}) {
  const hasConnector = roundIndex < totalRounds - 1;
  const cardHeight = CARD_HEIGHT * 2 + 4;

  return (
    <div className="flex items-stretch gap-0">
      <div
        className="shrink-0 rounded-lg border border-[#1f2937] bg-[#0d1118] transition-colors hover:border-[#374151]"
        style={{ width: COLUMN_WIDTH, minHeight: cardHeight }}
      >
        <MatchupCard game={game} />
      </div>
      {hasConnector && (
        <div
          className="shrink-0 border-l border-[#374151]/25"
          style={{ width: CONNECTOR_WIDTH }}
          aria-hidden
        />
      )}
    </div>
  );
}

function MatchupCard({ game }: { game: BracketGame }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md">
      <TeamRow
        team={game.teamA}
        isWinner={game.winnerTeamId === game.teamA.id}
      />
      <div className="h-px shrink-0 bg-[#1f2937]" />
      <TeamRow
        team={game.teamB}
        isWinner={game.winnerTeamId === game.teamB.id}
      />
    </div>
  );
}

function TeamRow({
  team,
  isWinner,
}: {
  team: { id: string; seed: number; name: string };
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 text-sm ${
        isWinner
          ? "bg-emerald-500/10 font-semibold text-emerald-100"
          : "bg-transparent text-neutral-300"
      }`}
      style={{ minHeight: CARD_HEIGHT }}
    >
      <span
        className={`flex h-5 w-6 shrink-0 items-center justify-center rounded text-xs ${
          isWinner ? "bg-emerald-500/30 text-emerald-200" : "bg-[#1f2937] text-neutral-400"
        }`}
      >
        {team.seed || "-"}
      </span>
      <span className="truncate">{team.name || "TBD"}</span>
    </div>
  );
}
