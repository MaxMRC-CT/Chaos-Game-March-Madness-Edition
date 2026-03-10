"use client";

type Team = {
  id: string;
  name: string;
  shortName: string | null;
  seed: number;
  region: string;
};

type Pick = {
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  member: { displayName: string };
};

const REGION_ORDER = ["East", "West", "South", "Midwest"];

export function BracketView({
  teams,
  picksByTeamId,
}: {
  teams: Team[];
  picksByTeamId: Record<string, Pick | undefined>;
}) {
  const regions = REGION_ORDER.map((region) => ({
    region,
    teams: teams.filter((team) => team.region === region),
  })).filter((bucket) => bucket.teams.length > 0);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-100">Bracket</h2>

      <div className="space-y-2 lg:hidden">
        {regions.map((bucket) => (
          <details key={bucket.region} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-200">
              {bucket.region}
            </summary>
            <RegionList teams={bucket.teams} picksByTeamId={picksByTeamId} />
          </details>
        ))}
      </div>

      <div className="hidden grid-cols-2 gap-3 lg:grid">
        {regions.map((bucket) => (
          <section key={bucket.region} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <h3 className="mb-2 text-sm font-semibold text-neutral-200">{bucket.region}</h3>
            <RegionList teams={bucket.teams} picksByTeamId={picksByTeamId} />
          </section>
        ))}
      </div>
    </section>
  );
}

function RegionList({
  teams,
  picksByTeamId,
}: {
  teams: Team[];
  picksByTeamId: Record<string, Pick | undefined>;
}) {
  return (
    <ul className="space-y-2">
      {teams.map((team) => {
        const drafted = picksByTeamId[team.id];
        return (
          <li key={team.id} className="rounded-lg border border-neutral-800 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="mr-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
                  {team.seed}
                </span>
                <span className="truncate text-neutral-100">{team.shortName || team.name}</span>
              </div>
              {drafted ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                  {drafted.role} • {drafted.member.displayName || "Unknown"}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
