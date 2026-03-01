"use client";

import { useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  shortName: string | null;
  seed: number;
  region: string;
};

type TeamGridProps = {
  teams: Team[];
  selectedTeamId: string | null;
  canSelect: boolean;
  onSelectTeam: (team: Team) => void;
};

export function TeamGrid({
  teams,
  selectedTeamId,
  canSelect,
  onSelectTeam,
}: TeamGridProps) {
  const [query, setQuery] = useState("");

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return teams;
    return teams.filter((team) =>
      `${team.name} ${team.shortName ?? ""} ${team.region}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, teams]);

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-700">Available Teams</h2>
        <span className="text-xs text-neutral-500">{filteredTeams.length}</span>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search teams..."
        className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filteredTeams.map((team) => {
          const selected = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              disabled={!canSelect}
              onClick={() => onSelectTeam(team)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                selected
                  ? "border-black bg-neutral-100"
                  : "hover:border-neutral-400"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <p className="text-sm font-semibold">{team.shortName || team.name}</p>
              <p className="text-xs text-neutral-600">Seed {team.seed}</p>
              <p className="text-xs text-neutral-600">{team.region}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
