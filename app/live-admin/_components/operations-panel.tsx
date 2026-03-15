"use client";

export function OperationsPanel({
  disabled,
  onRefresh,
  onRecalculate,
  onSync,
  publicHref,
}: {
  disabled: boolean;
  onRefresh: () => void;
  onRecalculate: () => void;
  onSync: () => void;
  publicHref: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Tournament Operations
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">Essential controls</h2>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          Refresh Data
        </button>
        <button
          type="button"
          onClick={onRecalculate}
          disabled={disabled}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          Recalculate Standings
        </button>
        <button
          type="button"
          onClick={onSync}
          disabled={disabled}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          Sync League Data
        </button>
        <a
          href={publicHref}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
        >
          Go to Public League
        </a>
      </div>
    </section>
  );
}
