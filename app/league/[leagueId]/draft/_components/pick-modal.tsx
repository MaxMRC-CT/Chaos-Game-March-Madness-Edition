"use client";

type Team = {
  id: string;
  name: string;
  shortName: string | null;
  seed: number;
  region: string;
};

type PickModalProps = {
  open: boolean;
  team: Team | null;
  canConfirm: boolean;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
};

export function PickModal({
  open,
  team,
  canConfirm,
  pending,
  error,
  onCancel,
}: PickModalProps) {
  if (!open || !team) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-semibold">Confirm Pick</h3>
        <p className="mt-2 text-sm text-neutral-700">
          Draft {team.shortName || team.name} (Seed {team.seed}, {team.region})?
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={!canConfirm || pending}
            className="flex-1 rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {pending ? "Picking..." : "Confirm Pick"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
