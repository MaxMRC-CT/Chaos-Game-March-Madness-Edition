"use client";

import { useActionState } from "react";
import { startDraftFromForm } from "@/lib/actions/draft";

type ActionState = { error?: string } | null;

type StartDraftFormProps = {
  leagueId: string;
};

export function StartDraftForm({ leagueId }: StartDraftFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    startDraftFromForm,
    null,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Starting..." : "Start Draft"}
      </button>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
