"use client";

import { LiveAdminConsoleData } from "./types";

export function RecentlyUpdatedPanel({
  items,
  onEdit,
}: {
  items: LiveAdminConsoleData["recentlyUpdated"];
  onEdit: (slotId: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Recently Updated
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">Quick verification</h2>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-400">No results saved yet.</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <div key={item.slotId} className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-sm font-medium text-white">
                {item.winnerName} def <span className="text-neutral-400">{item.loserName}</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {item.roundLabel} • {formatTimestamp(item.updatedAt)}
              </p>
              <button
                type="button"
                onClick={() => onEdit(item.slotId)}
                className="mt-2 text-xs font-medium text-[#8ee8ff] hover:text-[#b7f1ff]"
              >
                Edit result
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return "just now";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
