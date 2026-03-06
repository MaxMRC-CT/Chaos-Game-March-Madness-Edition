"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY_MANAGED = "chaos_dev_managed";
const STORAGE_KEY_DEV_KEY = "chaos_dev_key";

function loadPersistedManaged(): { pin: string; leagueId?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANAGED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { pin?: string; leagueId?: string };
    if (parsed?.pin || parsed?.leagueId) {
      return { pin: parsed.pin ?? "", leagueId: parsed.leagueId };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function savePersistedManaged(pin: string, leagueId?: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY_MANAGED,
      JSON.stringify({ pin, leagueId: leagueId ?? undefined })
    );
  } catch {
    /* ignore */
  }
}

type ManagedLeague = {
  id: string;
  code: string;
  status: string;
  name: string;
  year: number;
};

type Member = {
  id: string;
  nickname: string;
  displayName: string;
  reconnectCode: string;
  loginUrl: string;
};

type RosterStatus = {
  memberId: string;
  nickname: string;
  displayName: string;
  heroes: number;
  villains: number;
  cinderellas: number;
  complete: boolean;
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
  topDeltas: Array<{ displayName: string; delta: number }>;
  recentEvents: Array<{ type: string; payload: unknown; createdAt: string }>;
  scoreUpdatedAt: string | null;
};

const ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG"] as const;

export default function DevControlCenterPage() {
  const [key, setKey] = useState("");
  const [managed, setManaged] = useState<{
    league: ManagedLeague | null;
    members: Member[];
    rosterStatus: RosterStatus[];
  } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [factoryNumUsers, setFactoryNumUsers] = useState(4);
  const [factoryPin, setFactoryPin] = useState("");
  const [factoryReset, setFactoryReset] = useState(true);
  const [selectedRound, setSelectedRound] = useState("R64");
  const [loadByPin, setLoadByPin] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const hydratedRef = useRef(false);

  const headers = () => ({
    "Content-Type": "application/json",
    "x-dev-key": key,
  });

  const fetchManaged = useCallback(
    async (opts?: { code?: string; leagueId?: string }) => {
      if (!key.trim()) return;
      setLoading("managed");
      setError(null);
      try {
        const leagueIdToUse =
          opts?.leagueId ?? managed?.league?.id;
        const codeToUse =
          opts?.code ?? (leagueIdToUse ? undefined : (loadByPin || undefined));
        let url = "/api/dev/managed-league";
        if (leagueIdToUse) {
          url = `/api/dev/managed-league?leagueId=${encodeURIComponent(leagueIdToUse)}`;
        } else if (codeToUse && /^\d{6}$/.test(codeToUse)) {
          url = `/api/dev/managed-league?code=${encodeURIComponent(codeToUse)}`;
        }
        const res = await fetch(url, { headers: { "x-dev-key": key } });
        const data = await res.json();
        if (data.ok && (data.league || data.members?.length)) {
          setManaged({
            league: data.league,
            members: data.members ?? [],
            rosterStatus: data.rosterStatus ?? [],
          });
          setLastRefreshAt(Date.now());
        } else if (data.ok && !data.league) {
          setManaged({ league: null, members: [], rosterStatus: [] });
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(null);
      }
    },
    [key, managed?.league?.id, loadByPin]
  );

  const fetchSnapshot = useCallback(
    async (opts?: { leagueId?: string; code?: string }) => {
      if (!key.trim()) return;
      const leagueId = opts?.leagueId ?? managed?.league?.id;
      const code = opts?.code ?? managed?.league?.code;
      if (!leagueId && !code) return;
    setLoading("snapshot");
    try {
      const url = leagueId
        ? `/api/dev/league-snapshot?leagueId=${encodeURIComponent(leagueId)}`
        : `/api/dev/league-snapshot?code=${encodeURIComponent(code!)}`;
      const res = await fetch(url, { headers: { "x-dev-key": key } });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        setLastRefreshAt(Date.now());
      }
    } finally {
      setLoading(null);
    }
  },
    [key, managed?.league?.id, managed?.league?.code]
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const savedKey = localStorage.getItem(STORAGE_KEY_DEV_KEY);
      if (savedKey) setKey(savedKey);
      const persisted = loadPersistedManaged();
      if (persisted) {
        setLoadByPin(persisted.pin);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (key.trim() && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_DEV_KEY, key);
      } catch {
        /* ignore */
      }
    }
  }, [key]);

  useEffect(() => {
    if (!key.trim()) return;
    const persisted = loadPersistedManaged();
    if (persisted?.leagueId) {
      fetchManaged({ leagueId: persisted.leagueId });
    } else if (persisted?.pin && /^\d{6}$/.test(persisted.pin)) {
      fetchManaged({ code: persisted.pin });
    } else {
      fetchManaged();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when key becomes available
  }, [key]);

  useEffect(() => {
    if (key.trim() && managed?.league) fetchSnapshot();
    else setSnapshot(null);
  }, [key, managed?.league?.id]);

  useEffect(() => {
    if (managed?.league) {
      savePersistedManaged(managed.league.code, managed.league.id);
    }
  }, [managed?.league?.id, managed?.league?.code]);

  async function callApi(
    path: string,
    body?: object,
    opts?: { onSuccess?: () => void }
  ) {
    setError(null);
    setSuccess(null);
    setLoading(path);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: headers(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setSuccess(data.message ?? "Done");
      opts?.onSuccess?.();
      if (data.leagueId) {
        await fetchManaged({ leagueId: data.leagueId });
        await fetchSnapshot({ leagueId: data.leagueId });
      } else {
        await fetchManaged();
        if (managed?.league) await fetchSnapshot();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setSuccess("Copied");
    setTimeout(() => setSuccess(null), 1500);
  }

  const league = managed?.league;
  const members = managed?.members ?? [];
  const rosterStatus = managed?.rosterStatus ?? [];

  return (
    <main className="min-h-dvh bg-[#0c1424] text-neutral-100">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <header className="border-b border-neutral-700/60 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dev Control Center
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Chaos v2 portfolio testing — one managed test league, no terminal
          </p>

          <section className="mt-4 rounded-lg border border-neutral-700/60 bg-neutral-900/50 p-4">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Dev Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="DEV_PANEL_KEY"
              className="w-full max-w-xs rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </section>
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

        {league && (
          <div
            className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-4 py-3"
            role="status"
            aria-label="Current managed league"
          >
            <h2 className="mb-2 text-sm font-semibold text-emerald-200">
              Current Managed League
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono font-medium text-white">
                PIN: {league.code}
              </span>
              <span className="rounded bg-neutral-800/80 px-2 py-0.5 text-neutral-300">
                {league.status}
              </span>
              <span className="text-neutral-400">{league.year}</span>
              <span className="text-neutral-400">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
              {lastRefreshAt && (
                <span className="text-neutral-500">
                  Last refresh:{" "}
                  {new Date(lastRefreshAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 1. Test League Factory */}
        <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            1. Test League Factory
          </h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Test users (1–4)
              </label>
              <select
                value={factoryNumUsers}
                onChange={(e) => setFactoryNumUsers(Number(e.target.value))}
                className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                PIN (empty = auto)
              </label>
              <input
                type="text"
                value={factoryPin}
                onChange={(e) => setFactoryPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Auto"
                maxLength={6}
                className="w-24 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
              />
            </div>
            <label className="flex items-center gap-2 self-end text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={factoryReset}
                onChange={(e) => setFactoryReset(e.target.checked)}
              />
              Reset existing managed test league
            </label>
          </div>
          <button
            onClick={() =>
              callApi("/api/dev/test-league-factory", {
                numUsers: factoryNumUsers,
                pin: factoryPin || undefined,
                resetExisting: factoryReset,
              })
            }
            disabled={!key.trim() || !!loading}
            className="mt-4 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "/api/dev/test-league-factory"
              ? "Creating…"
              : "Create Fresh 2025 Test League"}
          </button>
        </section>

        {/* 2. Test Session Links */}
        <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            2. Test Session Links
          </h2>
          {league ? (
            <>
              <div className="mb-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded bg-neutral-700/80 px-2 py-1 font-mono">
                  PIN: {league.code}
                </span>
                <span className="rounded bg-neutral-700/80 px-2 py-1">
                  {league.status}
                </span>
                <span className="rounded bg-neutral-700/80 px-2 py-1">
                  {league.year}
                </span>
                <span className="truncate rounded bg-neutral-700/80 px-2 py-1 font-mono text-xs max-w-[200px]" title={league.id}>
                  {league.id.slice(0, 12)}…
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-600 text-left text-neutral-400">
                      <th className="py-2 pr-4">Nickname</th>
                      <th className="py-2 pr-4">Reconnect</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-neutral-700/60"
                      >
                        <td className="py-2 pr-4 font-medium">{m.nickname}</td>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {m.reconnectCode}
                        </td>
                        <td className="py-2 flex flex-wrap gap-2">
                          <button
                            onClick={() => copy(m.reconnectCode)}
                            className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-700"
                          >
                            Copy
                          </button>
                          <a
                            href={m.loginUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-orange-600/60 bg-orange-900/30 px-2 py-1 text-xs text-orange-200 hover:bg-orange-900/50"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-neutral-400">
                <span>Load different league:</span>
                <input
                  type="text"
                  value={loadByPin}
                  onChange={(e) =>
                    setLoadByPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  maxLength={6}
                  className="w-20 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 font-mono text-sm"
                />
                <button
                  onClick={() => fetchManaged({ code: loadByPin })}
                  disabled={
                    !key.trim() || !/^\d{6}$/.test(loadByPin) || !!loading
                  }
                  className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-700 disabled:opacity-50"
                >
                  Load
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-500">
                Create a test league above, or load by PIN:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loadByPin}
                  onChange={(e) =>
                    setLoadByPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  maxLength={6}
                  className="w-24 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={() => fetchManaged({ code: loadByPin })}
                  disabled={!key.trim() || !/^\d{6}$/.test(loadByPin) || !!loading}
                  className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
                >
                  Load
                </button>
              </div>
            </div>
          )}
          {key.trim() && (
            <button
              onClick={async () => {
                await fetchManaged();
                if (league) await fetchSnapshot();
              }}
              disabled={!!loading}
              className="mt-3 rounded border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs hover:bg-neutral-700 disabled:opacity-50"
            >
              Refresh
            </button>
          )}
        </section>

        {/* 3. Roster Status */}
        <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            3. Roster Status
          </h2>
          {rosterStatus.length > 0 ? (
            <>
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-600 text-left text-neutral-400">
                      <th className="py-2 pr-4">Player</th>
                      <th className="py-2 pr-4">H</th>
                      <th className="py-2 pr-4">V</th>
                      <th className="py-2 pr-4">C</th>
                      <th className="py-2 pr-4">Complete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterStatus.map((r) => (
                      <tr
                        key={r.memberId}
                        className="border-b border-neutral-700/60"
                      >
                        <td className="py-2 pr-4">{r.nickname}</td>
                        <td className="py-2 pr-4">{r.heroes}/2</td>
                        <td className="py-2 pr-4">{r.villains}/2</td>
                        <td className="py-2 pr-4">{r.cinderellas}/2</td>
                        <td className="py-2">
                          {r.complete ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-amber-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    callApi("/api/dev/roster-actions", {
                      leagueId: league?.id,
                      code: league?.code,
                      action: "autofill",
                    })
                  }
                  disabled={!key.trim() || !!loading || league?.status !== "SETUP"}
                  className="rounded-lg border border-emerald-600/60 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Autofill
                </button>
                <button
                  onClick={() =>
                    callApi("/api/dev/roster-actions", {
                      leagueId: league?.id,
                      code: league?.code,
                      action: "reset",
                    })
                  }
                  disabled={!key.trim() || !!loading || league?.status !== "SETUP"}
                  className="rounded-lg border border-amber-600/60 bg-amber-900/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  onClick={() =>
                    callApi("/api/dev/roster-actions", {
                      leagueId: league?.id,
                      code: league?.code,
                      action: league?.status === "SETUP" || league?.status === "LOCKED" ? "lock" : "unlock",
                    })
                  }
                  disabled={!key.trim() || !!loading}
                  className="rounded-lg border border-violet-600/60 bg-violet-900/30 px-4 py-2 text-sm text-violet-200 hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {league?.status === "SETUP" || league?.status === "LOCKED" ? "Lock picks (→ LIVE)" : "Unlock picks"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              Create a test league and refresh.
            </p>
          )}
        </section>

        {/* 4. Results Simulator */}
        <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            4. Results Simulator
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Uses data/2025/results.json — no terminal needed
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Round</label>
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
                callApi("/api/dev/apply-round-replay", {
                  leagueId: league?.id,
                  code: league?.code,
                  round: selectedRound,
                })
              }
              disabled={!key.trim() || !!loading || !league}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply Round
            </button>
            <button
              onClick={() =>
                callApi("/api/dev/apply-round-replay", {
                  leagueId: league?.id,
                  code: league?.code,
                  action: "apply_next",
                })
              }
              disabled={!key.trim() || !!loading || !league}
              className="rounded-lg border border-amber-600/60 bg-amber-900/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply Next
            </button>
            <button
              onClick={() =>
                callApi("/api/dev/apply-round-replay", {
                  leagueId: league?.id,
                  code: league?.code,
                  action: "replay_full",
                })
              }
              disabled={!key.trim() || !!loading || !league}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Replay Full
            </button>
            <button
              onClick={() =>
                callApi("/api/dev/apply-round-replay", {
                  leagueId: league?.id,
                  code: league?.code,
                  action: "reset",
                })
              }
              disabled={!key.trim() || !!loading || !league}
              className="rounded-lg border border-rose-600/60 bg-rose-900/30 px-4 py-2 text-sm text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset Results
            </button>
          </div>
        </section>

        {/* 5. League Snapshot */}
        <section className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            5. League Snapshot
          </h2>
          {snapshot ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {ROUNDS.map((r) => {
                  const count = snapshot.counts[r] ?? 0;
                  const expected = snapshot.expected[r] ?? 0;
                  const done = count >= expected && expected > 0;
                  return (
                    <span
                      key={r}
                      className={`rounded px-2 py-1 text-xs font-mono ${
                        done
                          ? "bg-emerald-900/50 text-emerald-200 border border-emerald-700/50"
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700"
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
                <ul className="space-y-1 text-sm">
                  {snapshot.standings.slice(0, 6).map((s, i) => (
                    <li key={s.memberId} className="flex justify-between">
                      <span>
                        {i + 1}. {s.displayName}
                      </span>
                      <span className="font-mono">{s.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {snapshot.topDeltas.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-neutral-300">
                    Top deltas
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {snapshot.topDeltas.map((d, i) => (
                      <li key={i}>
                        {d.displayName}:{" "}
                        <span
                          className={
                            d.delta > 0 ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {d.delta > 0 ? "+" : ""}
                          {d.delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-300">
                  Recent events
                </h3>
                <ul className="space-y-1 text-xs text-neutral-400">
                  {snapshot.recentEvents.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      {e.type} —{" "}
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Select a managed league.</p>
          )}
          {key.trim() && league && (
            <button
              onClick={() => void fetchSnapshot()}
              disabled={!!loading}
              className="mt-3 rounded border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs hover:bg-neutral-700 disabled:opacity-50"
            >
              Refresh
            </button>
          )}
        </section>

        {/* Raw actions (collapsed) */}
        <details className="rounded-xl border border-neutral-700/60 bg-[#0f1623] p-5">
          <summary className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-300">
            Raw dev actions (advanced)
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/dev/legacy"
              className="rounded border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
            >
              Legacy Dev Panel →
            </a>
          </div>
        </details>
      </div>
    </main>
  );
}
