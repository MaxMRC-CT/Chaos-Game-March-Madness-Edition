"use client";

import { LiveAdminConsoleData } from "./types";

export function AuditSafetyPanel({
  audit,
  standingsUpdatedAt,
}: {
  audit: LiveAdminConsoleData["audit"];
  standingsUpdatedAt: string | null;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Audit / Safety
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">Operational confidence</h2>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <Row label="Completed games" value={String(audit.totalCompletedGames)} />
        <Row label="Pending games" value={String(audit.totalPendingGames)} />
        <Row label="Last updated game" value={audit.lastUpdatedGame ?? "None yet"} />
        <Row
          label="Bracket health"
          value={audit.roundHealthOk ? "Healthy" : audit.roundHealthError ?? "Needs review"}
          tone={audit.roundHealthOk ? "good" : "warn"}
        />
        <Row
          label="Standings sync"
          value={
            audit.standingsUpToDate
              ? `Up to date${standingsUpdatedAt ? ` • ${formatTimestamp(standingsUpdatedAt)}` : ""}`
              : "Recalculate recommended"
          }
          tone={audit.standingsUpToDate ? "good" : "warn"}
        />
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2.5">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p
        className={`mt-1 font-medium ${
          tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-neutral-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
