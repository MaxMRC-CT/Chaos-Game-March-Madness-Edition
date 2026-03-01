"use client";

type Pick = {
  id: string;
  pickNumber: number;
  memberId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  team: {
    id: string;
    name: string;
    shortName: string | null;
    seed: number;
    region: string;
  };
  createdAt: string;
};

type Member = {
  id: string;
  displayName: string;
};

type PickHistoryProps = {
  picks: Pick[];
  membersById: Record<string, Member>;
};

export function PickHistory({ picks, membersById }: PickHistoryProps) {
  const newestPickId = picks.length > 0 ? picks[picks.length - 1].id : null;

  return (
    <section className="rounded-xl border p-4">
      <h2 className="mb-3 text-sm font-medium text-neutral-700">Pick History</h2>
      {picks.length === 0 ? (
        <p className="text-sm text-neutral-600">No picks yet.</p>
      ) : (
        <ul className="space-y-2">
          {picks.map((pick) => (
            <li
              key={pick.id}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                newestPickId === pick.id
                  ? "border-emerald-500 bg-emerald-50 animate-pulse"
                  : ""
              }`}
            >
              #{pick.pickNumber} {membersById[pick.memberId]?.displayName || "Unknown"} drafted{" "}
              {pick.team.shortName || pick.team.name}{" "}
              <span className="text-neutral-500">[{pick.role}]</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
