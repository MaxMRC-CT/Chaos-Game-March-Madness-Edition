"use client";

type TeamPick = {
  id: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  team: {
    id: string;
    name: string;
    shortName: string | null;
    seed: number;
    region: string;
  };
};

export function MyTeamCards({
  myPicks,
}: {
  myPicks: TeamPick[];
}) {
  const roleOrder: Array<TeamPick["role"]> = ["HERO", "VILLAIN", "CINDERELLA"];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-100">My Team</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {roleOrder.map((role) => {
          const pick = myPicks.find((item) => item.role === role);
          return (
            <article
              key={role}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <p className="text-xs font-semibold tracking-wide text-emerald-400">{role}</p>
              {pick ? (
                <div className="mt-2 space-y-1">
                  <p className="text-base font-semibold text-neutral-100">
                    {pick.team.shortName || pick.team.name}
                  </p>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                      Seed {pick.team.seed}
                    </span>
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                      {pick.team.region}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">Owner: You</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">Not drafted</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
