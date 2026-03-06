"use client";

const ZOOM_OPTIONS = [0.75, 1, 1.25] as const;

const pillBase =
  "inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg border px-2.5 text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";
const pillActive =
  "border-violet-500/60 bg-violet-500/20 text-violet-200";
const pillInactive =
  "border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-700/80 hover:text-neutral-200";

type ZoomControlsProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Zoom">
      <span className="text-xs font-medium text-neutral-500">Zoom</span>
      <div className="flex gap-1">
        {ZOOM_OPTIONS.map((level) => (
          <button
            key={level}
            type="button"
            aria-label={`Zoom ${Math.round(level * 100)}%`}
            aria-pressed={zoom === level}
            onClick={() => onZoomChange(level)}
            className={`${pillBase} ${zoom === level ? pillActive : pillInactive}`}
          >
            {Math.round(level * 100)}%
          </button>
        ))}
      </div>
    </div>
  );
}
