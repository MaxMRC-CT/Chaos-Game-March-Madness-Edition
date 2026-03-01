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
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-2 sm:grid-cols-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-3 py-2 text-sm transition ${
            active === tab.id
              ? "bg-emerald-500 text-neutral-950"
              : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
