import { useState } from "react";
import type { BracketGame } from "./types";
import { REGIONS } from "./types";
import { FinalsBracket } from "./FinalsBracket";
import { RegionBracket } from "./RegionBracket";

type DesktopBracketProps = {
  games: BracketGame[];
};

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25] as const;

export function DesktopBracket({ games }: DesktopBracketProps) {
  const [zoom, setZoom] = useState<number>(0.75);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/80">
          Full Bracket
        </h2>
        <div className="flex items-center gap-1 text-[11px] text-white/60">
          <span className="mr-1">Zoom</span>
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              className={`rounded border px-1.5 py-0.5 ${
                zoom === level
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"
              }`}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80 p-4">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <div className="flex items-start gap-8">
            <RegionBracket region={REGIONS[0]} games={games} />
            <RegionBracket region={REGIONS[1]} games={games} />
            <FinalsBracket games={games} />
            <RegionBracket region={REGIONS[2]} games={games} />
            <RegionBracket region={REGIONS[3]} games={games} />
          </div>
        </div>
      </div>
    </div>
  );
}

