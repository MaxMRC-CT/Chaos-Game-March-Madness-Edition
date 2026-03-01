"use client";

type EventItem = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

export function ActivityFeed({ events }: { events: EventItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-100">Activity</h2>
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
            {formatEvent(event)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatEvent(event: EventItem) {
  const payload = (event.payload || {}) as Record<string, unknown>;
  switch (event.type) {
    case "DRAFT_COMPLETE":
      return "Draft complete. League is now live.";
    case "DRAFT_PICK_MADE":
      return `Pick #${payload.pickNumber ?? "?"} made (${String(payload.role ?? "ROLE")}).`;
    case "TEAM_ELIMINATED":
      return `Team eliminated in ${String(payload.eliminatedRound ?? "a round")}.`;
    case "RIVALRY_BONUS":
      return `Rivalry bonus applied (${String(payload.delta ?? 0)} pts).`;
    case "SCORE_RECALCULATED":
      return "Standings recalculated.";
    default:
      return event.type
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase());
  }
}
