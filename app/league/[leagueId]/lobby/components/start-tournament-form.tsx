"use client";

import { useActionState } from "react";
import { startTournamentFromForm } from "@/lib/actions/league";

type ActionState = { error?: string } | null;

type StartTournamentFormProps = {
  leagueId: string;
};

export function StartTournamentForm({ leagueId }: StartTournamentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    startTournamentFromForm,
    null,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#fb6223] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fb6223]/20 transition hover:bg-[#ff7a3d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start Tournament"}
      </button>
      <p className="text-xs text-neutral-500">
        All players must complete their roster (2 Heroes, 2 Villains, 2 Cinderellas) first.
      </p>
      {state?.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}
