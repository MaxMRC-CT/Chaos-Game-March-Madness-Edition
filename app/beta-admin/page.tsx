"use client";

import { useCallback, useEffect, useState } from "react";

type LeagueInfo = {
  id: string;
  code: string;
  status: string;
  name: string;
  year: number;
  memberCount: number;
  rosterComplete: number;
  rosterTotal: number;
};

type Snapshot = {
  leagueId: string;
  code: string;
  status: string;
  name: string;
  year: number;
  counts: Record<string, number>;
  expected: Record<string, number>;
  standings: Array<{ memberId: string; displayName: string; total: number }>;
  recentEvents: Array<{ type: string; payload: unknown; createdAt: string }>;
  scoreUpdatedAt: string | null;
};

const ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG"] as const;
const API_BASE = "/api/beta-admin";

function fetcher(
  url: string,
  opts?: RequestInit
): Promise<{ ok?: boolean; error?: string; [k: string]: unknown }> {
  return fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  }).then((r) => r.json());
}

export default function BetaAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selectedRound, setSelectedRound] = useState("R64");

  const checkAuth = useCallback(async () => {
    const data = await fetcher(`${API_BASE}/check`);
    setAuthed(data.ok === true);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("auth");
    try {
      const data = await fetcher(`${API_BASE}/auth`, {
        method: "POST",
        body: JSON.stringify({ key: keyInput }),
      });
      if (data.ok) {
        setAuthed(true);
        setSuccess("Authenticated");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(String(data.error ?? "Invalid key"));
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleLogout() {
    setError(null);
    await fetcher(`${API_BASE}/logout`, { method: "POST" });
    setAuthed(false);
    setLeague(null);
    setSnapshot(null);
  }

  const loadLeague = useCallback(async (code?: string) => {
    const c = code ?? pin;
    if (!/^\d{6}$/.test(c)) {
      setError("Enter a valid 6-digit PIN");
      return;
    }
    setError(null);
    setLoading("league");
    try {
      const [leagueRes, snapshotRes] = await Promise.all([
        fetcher(`${API_BASE}/league?code=${encodeURIComponent(c)}`),
        fetcher(`${API_BASE}/snapshot?code=${encodeURIComponent(c)}`),
      ]);
      if (leagueRes.ok && leagueRes.league) {
        setLeague(leagueRes.league as LeagueInfo);
      } else {
        setLeague(null);
        setError(String(leagueRes.message ?? "League not found"));
      }
      if (snapshotRes.ok && snapshotRes.snapshot) {
        setSnapshot(snapshotRes.snapshot as Snapshot);
      } else {
        setSnapshot(null);
      }
    } catch {
      setError("Failed to load league");
      setLeague(null);
      setSnapshot(null);
    } finally {
      setLoading(null);
    }
  }, [pin]);

  async function callSetStatus(status: string) {
    if (!league) return;
    setError(null);
    setSuccess(null);
    setLoading("set-status");
    try {
      const res = await fetcher(`${API_BASE}/set-status`, {
        method: "POST",
        body: JSON.stringify({
          code: league.code,
          leagueId: league.id,
          status,
        }),
      });
      if (res.ok) {
        setSuccess(String(res.message ?? `Status → ${status}`));
        setTimeout(() => setSuccess(null), 3000);
        await loadLeague(league.code);
      } else {
        setError(String(res.error ?? "Request failed"));
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(null);
    }
  }

  async function callApplyRound(body: {
    code?: string;
    leagueId?: string;
    round?: string;
    action?: string;
  }) {
    if (!league) return;
    setError(null);
    setSuccess(null);
    setLoading("apply");
    try {
      const res = await fetcher(`${API_BASE}/apply-round`, {
        method: "POST",
        body: JSON.stringify({
          code: league.code,
          leagueId: league.id,
          ...body,
        }),
      });
      if (res.ok) {
        setSuccess(String(res.message ?? "Done"));
        setTimeout(() => setSuccess(null), 3000);
        await loadLeague(league.code);
      } else {
        setError(String(res.error ?? "Request failed"));
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(null);
    }
  }

  if (authed === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0c1424]">
        <div className="text-neutral-400">Checking auth…</div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0c1424] px-4">
        <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-700/60 bg-[#0f1623] p-6">
          <header>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Beta Admin
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Private admin panel for tournament simulation
            </p>
          </header>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Admin Key
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="BETA_ADMIN_KEY"
                autoFocus
                className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-rose-600/50 bg-rose-900/20 px-4 py-2 text-sm text-rose-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!keyInput.trim() || !!loading}
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "auth" ? "Verifying…" : "Sign In"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#0c1424] text-neutral-100">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-700/60 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Beta Admin
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Simulate tournament rounds for deployed beta
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
          >
            Sign Out
          </button>
        </header>

        {error && (
          <div className="rounded-lg border border-rose-600/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-600/50 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {/* Load by PIN */}
        <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Load League
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Game PIN (6 digits)
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                maxLength={6}
                className="w-28 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-100"
              />
            </div>
            <button
              onClick={() => loadLeague()}
              disabled={!/^\d{6}$/.test(pin) || !!loading}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "league" ? "Loading…" : "Load"}
            </button>
          </div>
        </section>

        {league && (
          <>
            {/* League Info */}
            <section className="rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-5">
              <h2 className="mb-3 text-sm font-semibold text-emerald-200">
                Loaded League
              </h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="font-mono font-medium text-white">
                  PIN: {league.code}
                </span>
                <span className="text-neutral-100">{league.name}</span>
                <span className="rounded bg-neutral-800/80 px-2 py-0.5 text-neutral-300">
                  {league.status}
                </span>
                <span className="text-neutral-400">
                  {league.memberCount} member{league.memberCount !== 1 ? "s" : ""}
                </span>
                <span className="text-neutral-400">
                  Roster: {league.rosterComplete}/{league.rosterTotal} complete
                </span>
              </div>
            </section>

            {/* League State Controls - Beta admin overrides */}
            <section className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-5">
              <h2 className="mb-2 text-lg font-semibold text-amber-200">
                League State Controls
              </h2>
              <p className="mb-4 text-xs text-amber-200/80">
                Beta admin overrides — bypass normal lifecycle timing for simulation
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => callSetStatus("SETUP")}
                  disabled={!!loading}
                  className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Force Setup
                </button>
                <button
                  onClick={() => callSetStatus("LOCKED")}
                  disabled={!!loading}
                  className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Force Locked
                </button>
                <button
                  onClick={() => callSetStatus("LIVE")}
                  disabled={!!loading}
                  className="rounded-lg border border-amber-600/60 bg-amber-900/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Force Live
                </button>
                <button
                  onClick={() => callSetStatus("COMPLETE")}
                  disabled={!!loading}
                  className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Force Complete
                </button>
              </div>
            </section>

            {/* Round Controls */}
            <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">
                Apply Round
              </h2>
              <p className="mb-4 text-xs text-neutral-500">
                Uses data/2025/results.json — applies to this league only
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">
                    Round
                  </label>
                  <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(e.target.value)}
                    className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  >
                    {ROUNDS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    callApplyRound({ round: selectedRound, action: "apply" })
                  }
                  disabled={!!loading}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === "apply" ? "Applying…" : "Apply Round"}
                </button>
                <button
                  onClick={() =>
                    callApplyRound({ action: "apply_next" })
                  }
                  disabled={!!loading}
                  className="rounded-lg border border-amber-600/60 bg-amber-900/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply Next
                </button>
                <button
                  onClick={() => callApplyRound({ action: "reset" })}
                  disabled={!!loading}
                  className="rounded-lg border border-rose-600/60 bg-rose-900/30 px-4 py-2 text-sm text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset Results
                </button>
              </div>
            </section>

            {/* Standings / Snapshot */}
            {snapshot && (
              <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
                <h2 className="mb-4 text-lg font-semibold text-neutral-100">
                  Progress & Standings
                </h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  {ROUNDS.map((r) => {
                    const count = snapshot.counts[r] ?? 0;
                    const expected = snapshot.expected[r] ?? 0;
                    const done = count >= expected && expected > 0;
                    return (
                      <span
                        key={r}
                        className={`rounded px-2 py-1 text-xs font-mono ${
                          done
                            ? "border border-emerald-700/50 bg-emerald-900/50 text-emerald-200"
                            : "border border-neutral-700 bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {r}: {count}/{expected}
                      </span>
                    );
                  })}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-300">
                    Standings
                  </h3>
                  <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
                    {(snapshot?.standings ?? []).map((s, i) => (
                      <li key={s.memberId} className="flex justify-between">
                        <span>
                          {i + 1}. {s.displayName || "Unknown"}
                        </span>
                        <span className="font-mono text-neutral-300">
                          {s.total}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {(snapshot?.recentEvents ?? []).length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-medium text-neutral-300">
                      Recent Events
                    </h3>
                    <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-neutral-500">
                      {(snapshot?.recentEvents ?? []).slice(0, 5).map((e, i) => (
                        <li key={i}>
                          {e.type} —{" "}
                          {new Date(e.createdAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {authed && !league && !loading && (
          <p className="text-sm text-neutral-500">
            Enter a 6-digit Game PIN and click Load to manage a league.
          </p>
        )}
      </div>
    </main>
  );
}
