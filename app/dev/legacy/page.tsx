"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ProgressData = {
  ok: boolean;
  leagueId: string | null;
  code: string;
  status: string | null;
  counts: Record<string, number>;
  expected: Record<string, number>;
  updatedAt: string;
};

const ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG"] as const;

export default function LegacyDevPanelPage() {
  const [key, setKey] = useState("");
  const [code, setCode] = useState("111111");
  const [year, setYear] = useState(2025);
  const [round, setRound] = useState("R64");
  const [winnersText, setWinnersText] = useState("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [champTotalPoints, setChampTotalPoints] = useState<string>("");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [simulateMode, setSimulateMode] = useState<string>("RANDOM");
  const [simulateLog, setSimulateLog] = useState<string[]>([]);
  const [simulateError, setSimulateError] = useState<string | null>(null);

  const headers = () => ({
    "Content-Type": "application/json",
    "x-dev-key": key,
  });

  const fetchProgress = useCallback(async () => {
    if (!key.trim() || !/^\d{6}$/.test(code)) return;
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/dev/progress?leagueCode=${code}`, {
        headers: { "x-dev-key": key },
      });
      const data = await res.json();
      if (data.ok) setProgress(data);
    } catch {
      setProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }, [key, code]);

  useEffect(() => {
    if (key.trim() && /^\d{6}$/.test(code)) {
      fetchProgress();
    } else {
      setProgress(null);
    }
  }, [key, code, fetchProgress]);

  async function callApi(path: string, body?: object) {
    setOutput("");
    setLoading(path);
    setSimulateError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: headers(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
      const refreshPaths = [
        "/api/dev/wipe-db",
        "/api/dev/reset-pre-draft",
        "/api/dev/reset-live",
        "/api/dev/apply-results",
        "/api/dev/set-championship-total",
      ];
      if (refreshPaths.includes(path) && res.ok) {
        await fetchProgress();
      }
      return data;
    } catch (e) {
      setOutput(JSON.stringify({ error: String(e) }, null, 2));
    } finally {
      setLoading(null);
    }
  }

  function handleApplyResults() {
    setApplyError(null);
    if (!key.trim()) {
      setApplyError("Dev key is required.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setApplyError("League PIN must be 6 digits.");
      return;
    }
    if (typeof year !== "number" || isNaN(year)) {
      setApplyError("Tournament year must be a number.");
      return;
    }
    const winners = winnersText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (winners.length === 0) {
      setApplyError("At least one winner is required.");
      return;
    }
    callApi("/api/dev/apply-results", {
      code,
      year,
      round,
      winnersText: winners.join("\n"),
    });
  }

  return (
    <main className="min-h-dvh bg-[#111827] text-neutral-100">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Legacy Dev Panel
          </h1>
          <Link
            href="/dev"
            className="text-sm text-orange-400 hover:text-orange-300"
          >
            ← Dev Control Center
          </Link>
        </div>
        <p className="text-sm text-neutral-500">
          Raw actions (wipe, reset, apply results, simulate). Prefer the Dev
          Control Center for Chaos v2 testing.
        </p>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Dev Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter dev panel key"
            className="w-full max-w-xs rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </section>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <h2 className="mb-3 text-base font-medium text-neutral-200">
            Tournament Progress
          </h2>
          <p className="mb-2 text-xs text-neutral-500">
            League PIN: <span className="font-mono text-neutral-300">{code}</span>
            {!key.trim() && (
              <span className="ml-2 text-amber-500">(Enter dev key to load)</span>
            )}
          </p>
          {progress ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {progress.status != null && (
                  <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-200">
                    Status: {progress.status}
                  </span>
                )}
                {ROUNDS.map((r) => {
                  const count = progress.counts[r] ?? 0;
                  const expected = progress.expected[r] ?? 0;
                  const done = count >= expected && expected > 0;
                  return (
                    <span
                      key={r}
                      className={`rounded px-2 py-0.5 text-xs font-mono ${
                        done
                          ? "bg-emerald-900/50 text-emerald-200 border border-emerald-700/50"
                          : "bg-neutral-800 text-neutral-400 border border-[#1f2937]"
                      }`}
                    >
                      {r}: {count}/{expected}
                    </span>
                  );
                })}
              </div>
              <p className="mb-2 text-[10px] text-neutral-500">
                Last updated:{" "}
                {new Date(progress.updatedAt).toLocaleTimeString()}
              </p>
            </>
          ) : progressLoading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : key.trim() && /^\d{6}$/.test(code) ? (
            <p className="text-sm text-neutral-500">
              League not found or no games yet.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={fetchProgress}
              disabled={
                !key.trim() || !/^\d{6}$/.test(code) || progressLoading
              }
              className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-300 transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={async () => {
                if (!key.trim() || !/^\d{6}$/.test(code)) return;
                setLoading("/api/dev/round-health");
                try {
                  const res = await fetch(
                    `/api/dev/round-health?leagueCode=${encodeURIComponent(code)}`,
                    { headers: { "x-dev-key": key } },
                  );
                  const data = await res.json();
                  setOutput(JSON.stringify(data, null, 2));
                } finally {
                  setLoading(null);
                }
              }}
              disabled={
                !key.trim() || !/^\d{6}$/.test(code) || !!loading
              }
              className="rounded-lg border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Round Health
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <div className="mb-3 flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                League PIN (6 digits)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="111111"
                maxLength={6}
                className="w-24 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Tournament Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || 2025)}
                min={2020}
                max={2030}
                className="w-24 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => callApi("/api/dev/wipe-db")}
              disabled={!key || !!loading}
              className="rounded-lg border border-rose-700 bg-rose-900/40 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "/api/dev/wipe-db" ? "Wiping…" : "Wipe DEV DB"}
            </button>
            <button
              onClick={() => callApi("/api/dev/reset-pre-draft", { code, year })}
              disabled={!key || !!loading}
              className="rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "/api/dev/reset-pre-draft"
                ? "Resetting…"
                : "Reset PRE-DRAFT League"}
            </button>
            <button
              onClick={() => callApi("/api/dev/reset-live", { code, year })}
              disabled={!key || !!loading}
              className="rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "/api/dev/reset-live"
                ? "Resetting…"
                : "Reset LIVE League"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <h2 className="mb-3 text-base font-medium text-neutral-200">
            Set Championship Total (Tiebreak)
          </h2>
          <p className="mb-2 text-xs text-neutral-500">
            League PIN: {code}
          </p>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="number"
              value={champTotalPoints}
              onChange={(e) => setChampTotalPoints(e.target.value)}
              placeholder="e.g. 150"
              min={0}
              className="w-24 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button
              onClick={() =>
                callApi("/api/dev/set-championship-total", {
                  leagueCode: code,
                  championshipTotalPoints:
                    champTotalPoints === ""
                      ? null
                      : Math.max(0, parseInt(champTotalPoints, 10) || 0),
                })
              }
              disabled={!key || !!loading}
              className="rounded-lg border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "/api/dev/set-championship-total"
                ? "Setting…"
                : "Set championship total"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <h2 className="mb-3 text-base font-medium text-neutral-200">
            Apply Results (manual winners)
          </h2>
          <div className="mb-3 flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Round
              </label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {["R64", "R32", "S16", "E8", "F4", "NCG"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-2">
            <label className="mb-1 block text-xs text-neutral-500">
              Winners (one per line)
            </label>
            <textarea
              value={winnersText}
              onChange={(e) => {
                setWinnersText(e.target.value);
                setApplyError(null);
              }}
              placeholder="Paste winners here..."
              rows={6}
              className="w-full rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          {applyError && (
            <div className="mb-3 rounded-lg border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-200">
              {applyError}
            </div>
          )}
          <button
            onClick={handleApplyResults}
            disabled={!!loading}
            className="rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "/api/dev/apply-results"
              ? "Applying…"
              : "Apply Results"}
          </button>
        </section>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <h2 className="mb-3 text-base font-medium text-neutral-200">
            Simulate Entire Tournament
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Mode
              </label>
              <select
                value={simulateMode}
                onChange={(e) => setSimulateMode(e.target.value)}
                className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-neutral-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="REAL_RESULTS">REAL_RESULTS</option>
                <option value="RANDOM">RANDOM</option>
                <option value="HERO_ALWAYS_WINS">HERO_ALWAYS_WINS</option>
                <option value="CINDERELLA_CHAOS">CINDERELLA_CHAOS</option>
              </select>
            </div>
            <button
              onClick={async () => {
                setSimulateError(null);
                setSimulateLog([]);
                if (!key.trim()) {
                  setSimulateError("Dev key is required.");
                  return;
                }
                if (!/^\d{6}$/.test(code)) {
                  setSimulateError("League PIN must be 6 digits.");
                  return;
                }
                setLoading("/api/dev/simulate");
                try {
                  const res = await fetch("/api/dev/simulate", {
                    method: "POST",
                    headers: headers(),
                    body: JSON.stringify({
                      leagueCode: code,
                      year,
                      mode: simulateMode,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setSimulateError(data.error || "Simulate failed");
                    return;
                  }
                  const lines = (data.applied || []).map(
                    (a: { round: string; gamesApplied: number }) =>
                      `Applied ${a.round} (${a.gamesApplied} games)`,
                  );
                  setSimulateLog(lines);
                  setOutput(JSON.stringify(data, null, 2));
                  await fetchProgress();
                } catch (e) {
                  setSimulateError(String(e));
                } finally {
                  setLoading(null);
                }
              }}
              disabled={
                !key.trim() || !/^\d{6}$/.test(code) || !!loading
              }
              className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "/api/dev/simulate"
                ? "Simulating…"
                : "Simulate Whole Tournament"}
            </button>
          </div>
          {simulateError && (
            <div className="mb-3 rounded-lg border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-200">
              {simulateError}
            </div>
          )}
          {simulateLog.length > 0 && (
            <div className="mb-3 max-h-32 overflow-auto rounded-lg bg-[#111827] px-3 py-2 font-mono text-xs text-neutral-300">
              {simulateLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#1f2937] bg-[#0f1623] p-4">
          <p className="mb-2 text-xs text-neutral-400">Response</p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[#111827] p-4 text-xs text-neutral-300">
            {output || "—"}
          </pre>
        </section>
      </div>
    </main>
  );
}
