"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Standing = {
  memberId: string;
  displayName: string;
  HERO: number;
  VILLAIN: number;
  CINDERELLA: number;
  rivalry: number;
  total: number;
};

type EventItem = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

type StandingsResponse = {
  updatedAt: string | null;
  standings: Standing[];
  events: EventItem[];
};

export default function StandingsClient({ leagueId }: { leagueId: string }) {
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/standings?leagueId=${leagueId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load standings");
      const payload = (await response.json()) as StandingsResponse;
      setData(payload);
      setError(null);
    } catch {
      setError("Could not load standings");
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <main className="mx-auto min-h-dvh max-w-6xl space-y-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Standings</h1>
        <div className="flex gap-3 text-sm">
          <Link href={`/league/${leagueId}/draft`} className="underline">
            Draft
          </Link>
          <Link href={`/league/${leagueId}/lobby`} className="underline">
            Lobby
          </Link>
        </div>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left">Rank</th>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Hero</th>
              <th className="px-3 py-2 text-right">Villain</th>
              <th className="px-3 py-2 text-right">Cinderella</th>
              <th className="px-3 py-2 text-right">Rivalry</th>
            </tr>
          </thead>
          <tbody>
            {(data?.standings ?? []).map((row, index) => (
              <tr key={row.memberId} className="border-t">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{row.displayName}</td>
                <td className="px-3 py-2 text-right font-semibold">{row.total}</td>
                <td className="px-3 py-2 text-right">{row.HERO}</td>
                <td className="px-3 py-2 text-right">{row.VILLAIN}</td>
                <td className="px-3 py-2 text-right">{row.CINDERELLA}</td>
                <td className="px-3 py-2 text-right">{row.rivalry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Event Feed</h2>
        <ul className="space-y-2 text-sm">
          {(data?.events ?? []).map((event) => (
            <li key={event.id} className="rounded-lg border px-3 py-2">
              <span className="font-medium">{event.type}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
