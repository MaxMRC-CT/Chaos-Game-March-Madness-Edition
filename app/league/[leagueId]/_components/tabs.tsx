"use client";

export type HomeTab = "my-team" | "bracket" | "standings" | "activity";

export function HomeTabs({
  active,
  onChange,
}: {
  active: HomeTab;
  onChange: (next: HomeTab) => void;
}) {
  const tabs: Array<{ id: HomeTab; label: string }> = [
    { id: "my-team", label: "My Team" },
    { id: "bracket", label: "Bracket" },
    { id: "standings", label: "Standings" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/95 p-2 sm:grid-cols-4" role="tablist" aria-label="Dashboard tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
            active === tab.id
              ? "bg-violet-600 text-white shadow-inner"
              : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
