"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuditSafetyPanel } from "./audit-safety-panel";
import { LiveAdminAuth } from "./live-admin-auth";
import { LiveAdminHeader } from "./live-admin-header";
import { OperationsPanel } from "./operations-panel";
import { PendingResultsQueue } from "./pending-results-queue";
import { RecentlyUpdatedPanel } from "./recently-updated-panel";
import { LiveAdminConsoleData } from "./types";

type AuthState = "checking" | "authed" | "guest";

export function LiveAdminClient() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [data, setData] = useState<LiveAdminConsoleData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [selectedWinnerBySlot, setSelectedWinnerBySlot] = useState<Record<string, string>>({});
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const response = await fetch("/api/live-admin/check", { credentials: "include" });
      if (!cancelled) {
        setAuthState(response.ok ? "authed" : "guest");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadConsole = useCallback(async (codeOverride?: string) => {
    const nextCode = (codeOverride ?? pin).trim();
    if (!/^\d{6}$/.test(nextCode)) {
      setError("Enter a valid 6-digit Game PIN.");
      return;
    }

    setLoading("console");
    setError(null);
    const response = await fetch(`/api/live-admin/console?code=${encodeURIComponent(nextCode)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json()) as { ok?: boolean; data?: LiveAdminConsoleData | null; error?: string };
    setLoading(null);

    if (response.status === 401) {
      setAuthState("guest");
      return;
    }

    if (!response.ok) {
      setError(payload.error ?? "Could not load live admin data.");
      return;
    }

    if (!payload.data) {
      setData(null);
      setError("League not found.");
      return;
    }

    setPin(nextCode);
    setData(payload.data);
  }, [pin]);

  useEffect(() => {
    if (!data) return;
    const id = window.setInterval(() => void loadConsole(data.league.code), 30000);
    const handleFocus = () => void loadConsole(data.league.code);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadConsole(data.league.code);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [data, loadConsole]);

  useEffect(() => {
    if (!highlightedSlotId) return;
    const timeout = window.setTimeout(() => setHighlightedSlotId(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [highlightedSlotId]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading("auth");
    setError(null);

    const response = await fetch("/api/live-admin/auth", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyInput }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };

    setLoading(null);
    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Invalid admin key.");
      return;
    }

    setAuthState("authed");
    setSuccess("Authenticated");
    window.setTimeout(() => setSuccess(null), 1800);
  }

  async function handleLogout() {
    await fetch("/api/live-admin/logout", { method: "POST", credentials: "include" });
    setAuthState("guest");
    setData(null);
    setPin("");
    setKeyInput("");
  }

  function registerCardRef(slotId: string, element: HTMLDivElement | null) {
    cardRefs.current[slotId] = element;
  }

  function openEdit(slotId: string) {
    setShowCompleted(true);
    setEditingSlotId(slotId);
    const slot = data?.queue.flatMap((group) => group.games).find((game) => game.slotId === slotId);
    if (slot?.winnerTeamId) {
      setSelectedWinnerBySlot((current) => ({ ...current, [slotId]: slot.winnerTeamId! }));
    }
    window.requestAnimationFrame(() => {
      cardRefs.current[slotId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedSlotId(slotId);
    });
  }

  function handleChooseWinner(slotId: string, winnerTeamId: string) {
    setEditingSlotId(slotId);
    setSelectedWinnerBySlot((current) => ({ ...current, [slotId]: winnerTeamId }));
  }

  function handleCancel(slotId: string) {
    setEditingSlotId((current) => (current === slotId ? null : current));
    setSelectedWinnerBySlot((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  async function handleSave(slotId: string) {
    if (!data) return;
    const slot = data.queue.flatMap((group) => group.games).find((game) => game.slotId === slotId);
    const winnerTeamId = selectedWinnerBySlot[slotId];
    if (!slot || !winnerTeamId) return;

    const selectedWinnerName =
      winnerTeamId === slot.teamA.id
        ? slot.teamA.shortName || slot.teamA.name
        : slot.teamB.shortName || slot.teamB.name;
    const isOverwrite = slot.status === "completed" && slot.winnerTeamId !== winnerTeamId;

    const confirmed = window.confirm(
      isOverwrite
        ? `Overwrite this finalized result and advance ${selectedWinnerName} instead?`
        : `Confirm ${selectedWinnerName} as the winner?`,
    );
    if (!confirmed) return;

    setLoading(`save:${slotId}`);
    setError(null);

    const response = await fetch("/api/live-admin/save-result", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leagueId: data.league.id,
        round: slot.round,
        gameNo: slot.gameNo,
        winnerTeamId,
        allowOverwrite: isOverwrite,
      }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
      data?: LiveAdminConsoleData;
    };

    setLoading(null);

    if (response.status === 401) {
      setAuthState("guest");
      return;
    }

    if (!response.ok || !payload.ok || !payload.data) {
      setError(payload.error ?? "Could not save result.");
      return;
    }

    setData(payload.data);
    setSuccess(payload.message ?? "Result saved");
    window.setTimeout(() => setSuccess(null), 1800);
    setEditingSlotId(null);
    setSelectedWinnerBySlot((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });

    const updatedVisible = payload.data.queue.flatMap((group) =>
      group.games.filter((game) => showCompleted || game.status === "pending"),
    );
    const currentIndex = updatedVisible.findIndex((game) => game.slotId === slotId);
    const nextPending =
      updatedVisible.slice(currentIndex + 1).find((game) => game.status === "pending") ??
      updatedVisible.find((game) => game.status === "pending");

    if (nextPending) {
      setHighlightedSlotId(nextPending.slotId);
      window.requestAnimationFrame(() => {
        cardRefs.current[nextPending.slotId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }

  async function runOperation(kind: "recalculate" | "sync") {
    if (!data) return;
    setLoading(kind);
    setError(null);

    const response = await fetch(`/api/live-admin/${kind}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: data.league.id }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string; message?: string };
    setLoading(null);

    if (response.status === 401) {
      setAuthState("guest");
      return;
    }

    if (!response.ok || !payload.ok) {
      setError(payload.error ?? `Could not ${kind}.`);
      return;
    }

    setSuccess(payload.message ?? "Operation complete");
    window.setTimeout(() => setSuccess(null), 1800);
    await loadConsole(data.league.code);
  }

  if (authState === "checking") {
    return (
      <main className="app-shell app-safe-top app-safe-bottom flex items-center justify-center bg-[#0c1424] px-4 text-neutral-400">
        Checking admin access...
      </main>
    );
  }

  if (authState === "guest") {
    return (
      <LiveAdminAuth
        keyInput={keyInput}
        onChange={setKeyInput}
        onSubmit={handleLogin}
        loading={loading === "auth"}
        error={error}
      />
    );
  }

  return (
    <main className="app-shell app-safe-top app-safe-bottom bg-[#0c1424] px-4 text-neutral-100">
      <div className="mx-auto max-w-[1500px] space-y-5">
        {data ? (
          <>
            <LiveAdminHeader
              data={data}
              loading={loading === "console"}
              onRefresh={() => void loadConsole(data.league.code)}
              onSignOut={handleLogout}
            />

            <section className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <label className="mb-2 block text-sm font-medium text-neutral-300">Game PIN</label>
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-[#4dd8ff]/50 focus:outline-none focus:ring-1 focus:ring-[#4dd8ff]/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadConsole()}
                  disabled={loading === "console"}
                  className="rounded-xl bg-[#4dd8ff] px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-[#74e2ff] disabled:opacity-50"
                >
                  Load League
                </button>
              </div>
              <p className="mt-3 text-sm text-neutral-400">
                {data.league.name} • PIN {data.league.code}
              </p>
            </section>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <PendingResultsQueue
                queue={data.queue}
                showCompleted={showCompleted}
                onToggleCompleted={() => setShowCompleted((current) => !current)}
                editingSlotId={editingSlotId}
                selectedWinnerBySlot={selectedWinnerBySlot}
                savingSlotId={loading?.startsWith("save:") ? loading.slice(5) : null}
                highlightedSlotId={highlightedSlotId}
                registerCardRef={registerCardRef}
                onChooseWinner={handleChooseWinner}
                onStartEdit={openEdit}
                onCancel={handleCancel}
                onSave={(slotId) => void handleSave(slotId)}
              />

              <div className="space-y-5">
                <RecentlyUpdatedPanel items={data.recentlyUpdated} onEdit={openEdit} />
                <OperationsPanel
                  disabled={Boolean(loading)}
                  onRefresh={() => void loadConsole(data.league.code)}
                  onRecalculate={() => void runOperation("recalculate")}
                  onSync={() => void runOperation("sync")}
                  publicHref={`/league/${data.league.id}/dashboard`}
                />
                <AuditSafetyPanel
                  audit={data.audit}
                  standingsUpdatedAt={data.summary.standingsUpdatedAt}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-neutral-950/90 p-6 shadow-xl shadow-black/20">
              <p className="inline-flex rounded-full border border-[#fb6223]/30 bg-[#fb6223]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08d]">
                LIVE TOURNAMENT ADMIN
              </p>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Chaos League Live Admin
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                Load a production league by Game PIN to begin entering tournament results.
              </p>
            </div>

            <section className="rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <label className="mb-2 block text-sm font-medium text-neutral-300">Game PIN</label>
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-[#4dd8ff]/50 focus:outline-none focus:ring-1 focus:ring-[#4dd8ff]/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadConsole()}
                  disabled={loading === "console"}
                  className="rounded-xl bg-[#4dd8ff] px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-[#74e2ff] disabled:opacity-50"
                >
                  {loading === "console" ? "Loading..." : "Load League"}
                </button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
            </section>
          </>
        )}

        {success ? (
          <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100 shadow-xl shadow-black/30">
            {success}
          </div>
        ) : null}
      </div>
    </main>
  );
}
