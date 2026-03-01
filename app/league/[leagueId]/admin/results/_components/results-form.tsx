"use client";

import { useActionState, useMemo } from "react";
import { importTeamsFromForm, updateResultsFromForm } from "@/lib/actions/results";

type TeamOption = {
  id: string;
  name: string;
  seed: number;
  region: string;
};

type ActionState = { error?: string; success?: boolean } | null;

export default function ResultsForm({
  leagueId,
  teams,
}: {
  leagueId: string;
  teams: TeamOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateResultsFromForm,
    null,
  );
  const [importState, importAction, importPending] = useActionState<ActionState, FormData>(
    importTeamsFromForm,
    null,
  );

  const teamHelp = useMemo(
    () =>
      teams
        .map((team) => `${team.id} | (${team.seed}) ${team.name} - ${team.region}`)
        .join("\n"),
    [teams],
  );

  return (
    <div className="space-y-4">
      <form action={importAction} className="space-y-2 rounded-xl border p-4">
        <input type="hidden" name="leagueId" value={leagueId} />
        <button
          type="submit"
          disabled={importPending}
          className="w-full rounded-lg border px-4 py-2 text-sm disabled:opacity-60"
        >
          {importPending ? "Importing..." : "Import Teams"}
        </button>
        {importState?.error ? <p className="text-sm text-red-600">{importState.error}</p> : null}
        {importState?.success ? <p className="text-sm text-emerald-700">Teams imported.</p> : null}
      </form>

      <form action={formAction} className="space-y-4 rounded-xl border p-4">
        <input type="hidden" name="leagueId" value={leagueId} />

      <div>
        <label className="mb-1 block text-sm font-medium">Team Results JSON</label>
        <textarea
          name="teamResults"
          rows={8}
          defaultValue="[]"
          className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Format: [{`{"teamId":"...","wins":2,"eliminatedRound":"S16"}`}] (CHAMP for champion)
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tournament Games JSON</label>
        <textarea
          name="games"
          rows={8}
          defaultValue="[]"
          className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Format: [{`{"round":"R64","gameNo":1,"winnerTeamId":"...","loserTeamId":"..."}`}]
        </p>
      </div>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Team IDs</summary>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-neutral-600">{teamHelp}</pre>
      </details>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save Results & Recompute"}
        </button>

        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      </form>
    </div>
  );
}
