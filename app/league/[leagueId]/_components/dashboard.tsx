"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "./activity-feed";
import { BracketView } from "./bracket-view";
import { MyTeamCards } from "./my-team-cards";
import { HomeTab, HomeTabs } from "./tabs";

type LeagueHomeResponse = {
  league: {
    id: string;
    name: string;
    code: string;
    status: "LIVE" | "COMPLETE" | "SETUP" | "DRAFT";
  };
  me: {
    memberId: string;
    displayName: string;
    isAdmin: boolean;
  } | null;
  myPicks: Array<{
    id: string;
    role: "HERO" | "VILLAIN" | "CINDERELLA";
    team: { id: string; name: string; shortName: string | null; seed: number; region: string };
  }>;
  standingsTop: Array<{
    memberId: string;
    displayName: string;
    total: number;
    HERO?: number;
    VILLAIN?: number;
    CINDERELLA?: number;
    rivalry?: number;
    championshipPrediction?: number | null;
  }>;
  standingsUpdatedAt: string | null;
  events: Array<{ id: string; type: string; payload: unknown; createdAt: string }>;
  allPicks: Array<{
    id: string;
    role: "HERO" | "VILLAIN" | "CINDERELLA";
    teamId: string;
    member: { displayName: string };
  }>;
  teams: Array<{ id: string; name: string; shortName: string | null; seed: number; region: string }>;
};

export function LeagueHomeDashboard({
  leagueId,
  initialLeague,
}: {
  leagueId: string;
  initialLeague: { name: string; status: string; code: string };
}) {
  const [data, setData] = useState<LeagueHomeResponse | null>(null);
  const [tab, setTab] = useState<HomeTab>("my-team");
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/league-home?leagueId=${leagueId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load dashboard");
      const payload = (await response.json()) as LeagueHomeResponse;
      setData(payload);
      setError(null);
    } catch {
      setError("Could not load dashboard");
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if ((data?.league.status || initialLeague.status) !== "LIVE") {
      return;
    }
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [data?.league.status, initialLeague.status, load]);

  const league = data?.league ?? initialLeague;
  const me = data?.me ?? null;

  const picksByTeamId = useMemo(() => {
    const map: Record<string, LeagueHomeResponse["allPicks"][number]> = {};
    for (const pick of data?.allPicks ?? []) {
      map[pick.teamId] = pick;
    }
    return map;
  }, [data?.allPicks]);

  async function copyPin() {
    const text = league.code || "------";
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("idle");
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-6xl space-y-4 p-4 sm:p-6">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-100">{league.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                {league.status}
              </span>
              {me ? (
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                  You are: {me.displayName}
                </span>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Game PIN</p>
            <p className="font-mono text-4xl font-bold text-neutral-100">{league.code || "—"}</p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={copyPin}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100"
              >
                Copy PIN
              </button>
              <Link
                href={`/join?code=${encodeURIComponent(league.code)}`}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100"
              >
                Share Link
              </Link>
            </div>
            {copyState === "copied" ? (
              <p className="mt-1 text-xs text-emerald-300">Copied!</p>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      {me ? <MyTeamCards myPicks={data?.myPicks ?? []} /> : null}

      <HomeTabs active={tab} onChange={setTab} />

      {tab === "my-team" ? (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          Your roster is shown above. Use Bracket, Standings, and Activity tabs for live league view.
        </section>
      ) : null}
      {tab === "bracket" ? (
        <BracketView teams={data?.teams ?? []} picksByTeamId={picksByTeamId} />
      ) : null}
      {tab === "standings" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-100">Standings</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left text-neutral-300">Rank</th>
                  <th className="px-3 py-2 text-left text-neutral-300">Player</th>
                  <th className="px-3 py-2 text-right text-neutral-300">Total</th>
                  <th className="px-3 py-2 text-right text-neutral-300">Hero</th>
                  <th className="px-3 py-2 text-right text-neutral-300">Villain</th>
                  <th className="px-3 py-2 text-right text-neutral-300">Cinderella</th>
                  <th className="px-3 py-2 text-right text-neutral-300">Rivalry</th>
                  <th className="px-3 py-2 text-right text-neutral-300">TB</th>
                </tr>
              </thead>
              <tbody>
                {(data?.standingsTop ?? []).map((row, index) => (
                  <tr key={row.memberId} className="border-t border-neutral-800 text-neutral-100">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{row.displayName}</td>
                    <td className="px-3 py-2 text-right font-semibold">{row.total ?? 0}</td>
                    <td className="px-3 py-2 text-right">{row.HERO ?? 0}</td>
                    <td className="px-3 py-2 text-right">{row.VILLAIN ?? 0}</td>
                    <td className="px-3 py-2 text-right">{row.CINDERELLA ?? 0}</td>
                    <td className="px-3 py-2 text-right">{row.rivalry ?? 0}</td>
                    <td className="px-3 py-2 text-right text-neutral-500">
                      {row.championshipPrediction != null ? row.championshipPrediction : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.standingsUpdatedAt ? (
            <p className="text-xs text-neutral-500">
              Updated: {new Date(data.standingsUpdatedAt).toLocaleString()}
            </p>
          ) : null}
        </section>
      ) : null}
      {tab === "activity" ? <ActivityFeed events={data?.events ?? []} /> : null}

      {me?.isAdmin ? (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="text-sm font-medium text-neutral-100">Admin</h3>
          <div className="mt-2 flex gap-2">
            <Link
              href={`/league/${leagueId}/admin/results`}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
            >
              Import / Update Results
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
