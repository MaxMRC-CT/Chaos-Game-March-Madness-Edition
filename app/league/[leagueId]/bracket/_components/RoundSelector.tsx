"use client";

const ROUNDS = [
  { key: "R64" as const, label: "R64" },
  { key: "R32" as const, label: "R32" },
  { key: "S16" as const, label: "S16" },
  { key: "E8" as const, label: "E8" },
  { key: "F4" as const, label: "F4" },
  { key: "FINAL" as const, label: "Final" },
] as const;

export type RoundKey = (typeof ROUNDS)[number]["key"];

const pillBase =
  "inline-flex h-7 min-w-[1.9rem] items-center justify-center rounded-lg border px-2 text-[11px] font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";
const pillActive =
  "border-violet-500/60 bg-violet-500/20 text-violet-200";
const pillInactive =
  "border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-700/80 hover:text-neutral-200";

type RoundSelectorProps = {
  value: RoundKey;
  onChange: (round: RoundKey) => void;
};

export function RoundSelector({ value, onChange }: RoundSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Round selection">
      {ROUNDS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          aria-label={`Show ${label}`}
          onClick={() => onChange(key)}
          className={`${pillBase} ${value === key ? pillActive : pillInactive}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
