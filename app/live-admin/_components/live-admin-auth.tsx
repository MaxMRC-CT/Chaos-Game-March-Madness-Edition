"use client";

export function LiveAdminAuth({
  keyInput,
  onChange,
  onSubmit,
  loading,
  error,
}: {
  keyInput: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0c1424] px-4 text-neutral-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950/90 p-6 shadow-2xl shadow-black/30">
        <div className="mb-6">
          <p className="inline-flex rounded-full border border-[#fb6223]/30 bg-[#fb6223]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08d]">
            LIVE TOURNAMENT ADMIN
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Chaos League Live Admin
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Protected operations console for live NCAA result entry.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Admin Key</label>
            <input
              type="password"
              value={keyInput}
              onChange={(event) => onChange(event.target.value)}
              placeholder="LIVE_ADMIN_KEY"
              autoFocus
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#fb6223]/50 focus:outline-none focus:ring-1 focus:ring-[#fb6223]/50"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!keyInput.trim() || loading}
            className="w-full rounded-xl bg-[#fb6223] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e35a20] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Enter Live Admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
