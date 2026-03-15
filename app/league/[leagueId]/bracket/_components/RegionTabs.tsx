"use client";

const REGIONS = ["East", "West", "South", "Midwest"] as const;
export type RegionKey = (typeof REGIONS)[number];

const pillBase =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border px-2.5 text-[11px] font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";
const pillActive =
  "border-violet-500/60 bg-violet-500/20 text-violet-200";
const pillInactive =
  "border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-700/80 hover:text-neutral-200";

type RegionTabsProps = {
  value: RegionKey;
  onChange: (region: RegionKey) => void;
};

export function RegionTabs({ value, onChange }: RegionTabsProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin"
      role="tablist"
      aria-label="Region"
    >
      {REGIONS.map((region) => (
        <button
          key={region}
          type="button"
          role="tab"
          aria-selected={value === region}
          aria-label={`Show ${region} region`}
          onClick={() => onChange(region)}
          className={`${pillBase} ${value === region ? pillActive : pillInactive}`}
        >
          {region}
        </button>
      ))}
    </div>
  );
}
