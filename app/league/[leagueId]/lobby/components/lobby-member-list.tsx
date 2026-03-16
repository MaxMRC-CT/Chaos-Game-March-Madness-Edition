"use client";

import { Crown, Radio } from "lucide-react";
import { useEffect, useState } from "react";

type LobbyMember = {
  id: string;
  displayName: string;
  isAdmin: boolean;
};

type LobbyMemberListProps = {
  leagueId: string;
  initialMembers: LobbyMember[];
  currentMemberId?: string | null;
};

export function LobbyMemberList({
  leagueId,
  initialMembers,
  currentMemberId = null,
}: LobbyMemberListProps) {
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
    <section className="rounded-2xl border border-white/10 bg-neutral-950/85 p-4 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            League Lobby
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {members.length} {members.length === 1 ? "player" : "players"} in
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
          <Radio className="size-3.5" />
          {error ? "Polling paused" : "Live"}
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-xs text-amber-300">{error}</p>
      ) : null}

      <ul className="space-y-2">
        {members.map((member, index) => {
          const isYou = member.id === currentMemberId;
          return (
            <li
              key={member.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                isYou
                  ? "border-violet-500/25 bg-violet-500/10"
                  : "border-white/8 bg-white/[0.03]"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {member.displayName || "Unknown"}
                  {isYou ? <span className="ml-1 text-neutral-400">(You)</span> : null}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Player {index + 1}
                </p>
              </div>
              {member.isAdmin ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-200">
                  <Crown className="size-3.5" />
                  League Manager
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
