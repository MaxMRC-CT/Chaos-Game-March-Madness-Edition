"use client";

import { useEffect, useState } from "react";

type LobbyMember = {
  id: string;
  displayName: string;
  isAdmin: boolean;
};

type LobbyMemberListProps = {
  leagueId: string;
  initialMembers: LobbyMember[];
};

export function LobbyMemberList({ leagueId, initialMembers }: LobbyMemberListProps) {
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(`/api/league-members?leagueId=${leagueId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to refresh players");
        }

        const data = await response.json();
        if (!cancelled && Array.isArray(data.members)) {
          setMembers(data.members);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Live updates unavailable");
        }
      }
    }

    const intervalId = window.setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [leagueId]);

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-700">Players</h2>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <span>{member.displayName || "Unknown"}</span>
            {member.isAdmin ? (
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">League Manager</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
