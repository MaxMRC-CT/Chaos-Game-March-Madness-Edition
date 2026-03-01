"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DraftOrder } from "./draft-order";
import { TeamGrid } from "./team-grid";
import { PickHistory } from "./pick-history";
import { PickModal } from "./pick-modal";
import { makePickFromForm } from "@/lib/actions/draft";

type DraftMeta = {
  players: number;
  nextPickNumber: number;
  totalDraftPicks: number;
  remainingPicks: number;
  teamsTotal: number;
  teamsAvailable: number;
  warning: string | null;
};

type DraftState = {
  league: {
    id: string;
    status: string;
    currentPick: number; // EXPECTED: nextPickNumber (picks.length + 1) from API
    code?: string;
  };
  currentRole: "HERO" | "VILLAIN" | "CINDERELLA";
  draftMeta?: DraftMeta;
  me: {
    memberId: string;
    draftPosition: number | null;
    displayName: string;
    isAdmin: boolean;
  } | null;
  members: Array<{
    id: string;
    displayName: string;
    draftPosition: number | null;
    isAdmin: boolean;
  }>;
  picks: Array<{
    id: string;
    pickNumber: number;
    memberId: string;
    role: "HERO" | "VILLAIN" | "CINDERELLA";
    createdAt: string;
    team: {
      id: string;
      name: string;
      shortName: string | null;
      seed: number;
      region: string;
    };
  }>;
  availableTeams: Array<{
    id: string;
    name: string;
    shortName: string | null;
    seed: number;
    region: string;
  }>;
  events: Array<{
    id: string;
    type: string;
    payload: unknown;
    createdAt: string;
  }>;
};

type ActionState = { error?: string } | null;

type DraftRoomProps = {
  leagueId: string;
};

export function DraftRoom({ leagueId }: DraftRoomProps) {
  const [state, setState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [pickState, pickFormAction, pickPending] = useActionState<ActionState, FormData>(
    makePickFromForm,
    null,
  );

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`/api/draft-state?leagueId=${leagueId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load draft");

      const data = (await response.json()) as DraftState;
      setState(data);
      setLoadError(null);
    } catch {
      setLoadError("Could not load draft state");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void fetchState();
    const intervalId = window.setInterval(() => void fetchState(), 2500);
    return () => window.clearInterval(intervalId);
  }, [fetchState]);

  const membersById = useMemo(() => {
    const map: Record<string, { id: string; displayName: string }> = {};
    for (const member of state?.members ?? []) map[member.id] = member;
    return map;
  }, [state?.members]);

  if (loading) {
    return <main className="mx-auto min-h-dvh max-w-6xl p-6">Loading draft...</main>;
  }

  if (loadError || !state) {
    return (
      <main className="mx-auto min-h-dvh max-w-6xl space-y-3 p-6">
        <p className="text-red-600">{loadError || "Draft unavailable"}</p>
        <Link href={`/league/${leagueId}/lobby`} className="text-sm underline">
          Back to lobby
        </Link>
      </main>
    );
  }

  if (state.league.status !== "DRAFT") {
    const destination =
      state.league.status === "LIVE" || state.league.status === "COMPLETE"
        ? `/league/${leagueId}/dashboard`
        : `/league/${leagueId}/lobby`;

    return (
      <main className="mx-auto min-h-dvh max-w-6xl space-y-3 p-6">
        <p className="text-sm text-neutral-700">
          Draft is not live right now. Current status: {state.league.status}
        </p>
        <Link href={destination} className="text-sm underline">
          {state.league.status === "LIVE" || state.league.status === "COMPLETE"
            ? "Go to Dashboard"
            : "Back to Lobby"}
        </Link>
      </main>
    );
  }

  if (!state.me) {
    return (
      <main className="mx-auto min-h-dvh max-w-6xl space-y-3 p-6">
        <p className="text-sm text-neutral-700">
          You are not joined to this league on this device.
        </p>
        <Link
          href="/join"
          className="inline-block rounded-lg bg-black px-4 py-2 text-sm text-white"
        >
          Join League
        </Link>
      </main>
    );
  }

  const draftMembers = state.members
    .filter((m) => m.draftPosition !== null)
    .sort((a, b) => (a.draftPosition ?? 999) - (b.draftPosition ?? 999));

  const memberCount = Math.max(draftMembers.length, 1);

  // Use API-derived "next pick number" (picks.length + 1) rather than draftPosition.
  // We compute on-clock by snake draft position from pick number.
  const nextPickNumber = state.draftMeta?.nextPickNumber ?? state.league.currentPick ?? state.picks.length + 1;
  const pickIndex0 = Math.max(nextPickNumber - 1, 0);
  const roundIndex0 = Math.floor(pickIndex0 / memberCount);
  const indexInRound = pickIndex0 % memberCount;
  const isSnakeReverse = roundIndex0 % 2 === 1;
  const onClockIndex = isSnakeReverse ? memberCount - 1 - indexInRound : indexInRound;
  const onClockMember = draftMembers[onClockIndex] ?? null;

  const isMyTurn = Boolean(state.me && onClockMember && state.me.memberId === onClockMember.id);

  const selectedTeam = state.availableTeams.find((team) => team.id === selectedTeamId) ?? null;

  // Correct "picked" set for DraftOrder UI highlight
  const pickedMemberIds = new Set(state.picks.map((pick) => pick.memberId));

  // Round label (1..3) from pick count
  const currentRound = Math.floor(state.picks.length / memberCount) + 1;

  // Profile pill text
  const meLabel = `${state.me.displayName}${state.me.isAdmin ? " (Host)" : ""}`;

  // Warning when teams run out / seed is incomplete
  const warning = state.draftMeta?.warning ?? null;
  const teamsAvailable = state.draftMeta?.teamsAvailable ?? state.availableTeams.length;

  return (
    <main className="mx-auto min-h-dvh max-w-7xl space-y-4 p-4 sm:p-6">
      <section className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
              Draft is live
            </span>

            {/* Profile / identity pill */}
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              You are: <span className="font-semibold">{meLabel}</span>
            </span>

            {/* Optional league code */}
            {state.league.code ? (
              <span className="hidden sm:inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                PIN {state.league.code}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>Pick #{nextPickNumber}</span>
            <Link href={`/league/${leagueId}/standings`} className="underline">
              Standings
            </Link>
          </div>
        </div>

        <h1 className="text-2xl font-semibold">
          {onClockMember?.displayName || "Unknown"} is on the clock
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
            Round {currentRound} - {state.currentRole}
          </p>

          {state.draftMeta ? (
            <p className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              Picks: {state.picks.length}/{state.draftMeta.totalDraftPicks}
            </p>
          ) : null}

          <p className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
            Teams left: {teamsAvailable}
          </p>
        </div>

        {warning ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">Heads up:</span> {warning}
          </div>
        ) : null}

        {isMyTurn ? (
          <p className="mt-2 text-sm font-semibold text-emerald-700">You&apos;re up</p>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">
            Waiting for {onClockMember?.displayName || "current picker"}
          </p>
        )}
      </section>

      <details className="rounded-xl border p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">Order</summary>
        <div className="mt-3">
          <DraftOrder
            members={draftMembers}
            currentPick={nextPickNumber}
            pickedMemberIds={pickedMemberIds}
          />
        </div>
      </details>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="hidden lg:block">
          <section className="rounded-xl border p-4">
            <h2 className="mb-3 text-sm font-medium text-neutral-700">Draft Order</h2>
            <DraftOrder
              members={draftMembers}
              currentPick={nextPickNumber}
              pickedMemberIds={pickedMemberIds}
            />
          </section>
        </aside>

        <section className="space-y-4">
          <TeamGrid
            teams={state.availableTeams}
            selectedTeamId={selectedTeamId}
            canSelect={isMyTurn && !pickPending && state.availableTeams.length > 0}
            onSelectTeam={(team) => {
              if (!isMyTurn || pickPending) return;
              setSelectedTeamId(team.id);
              setModalOpen(true);
            }}
          />

          {state.availableTeams.length === 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              No teams available to pick. This usually means the tournament teams weren&apos;t fully
              seeded for this year, or teams were already fully consumed by picks.
            </div>
          ) : null}

          <div className="lg:hidden">
            <PickHistory picks={state.picks} membersById={membersById} />
          </div>
        </section>

        <aside className="hidden lg:block">
          <PickHistory picks={state.picks} membersById={membersById} />
        </aside>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Event Feed</h2>
        <ul className="space-y-2 text-sm">
          {state.events.map((event) => (
            <li key={event.id} className="rounded-lg border px-3 py-2">
              <span className="font-medium">{event.type}</span>
            </li>
          ))}
        </ul>
      </section>

      <form action={pickFormAction}>
        <input type="hidden" name="leagueId" value={leagueId} />
        <input type="hidden" name="teamId" value={selectedTeam?.id || ""} />
        <input type="hidden" name="role" value={state.currentRole} />
        <PickModal
          open={modalOpen}
          team={selectedTeam}
          canConfirm={isMyTurn && Boolean(selectedTeam)}
          pending={pickPending}
          error={pickState?.error ?? null}
          onCancel={() => {
            if (pickPending) return;
            setModalOpen(false);
            setSelectedTeamId(null);
          }}
        />
      </form>
    </main>
  );
}
