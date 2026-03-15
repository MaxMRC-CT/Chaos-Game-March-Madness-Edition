"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SavedLeagueSelector } from "@/components/saved-league-selector";
import {
  getSavedLeagues,
  removeSavedLeague,
  type SavedLeagueSession,
} from "@/lib/client/device-session";
import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";

export default function MyLeaguesClient() {
  const router = useRouter();
  const [savedLeagues, setSavedLeagues] = useState<SavedLeagueSession[]>([]);
  const [pendingLeagueId, setPendingLeagueId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedLeagues(getSavedLeagues());
  }, []);

  async function enterLeague(league: SavedLeagueSession) {
    setPendingLeagueId(league.leagueId);
    setMessage(null);

    try {
      const response = await fetch("/api/device-reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: league.leagueId,
          playerId: league.playerId,
        }),
      });

      if (!response.ok) {
        removeSavedLeague(league.leagueId);
        setSavedLeagues(getSavedLeagues());
        setMessage(`${league.leagueName} is no longer available on this device.`);
        return;
      }

      router.push(`/league/${league.leagueId}/dashboard`);
    } catch {
      setMessage("Could not reconnect right now. Please try again.");
    } finally {
      setPendingLeagueId(null);
    }
  }

  if (savedLeagues.length === 0) {
    return (
      <BrandBackground>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-8 text-neutral-100">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md">
            <h1 className="text-2xl font-semibold text-white">My Leagues</h1>
            <p className="mt-2 text-sm text-neutral-400">
              No saved leagues on this device yet.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/join"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#fb6223] px-4 py-3 text-sm font-semibold text-white"
              >
                Join a League
              </Link>
              <Link
                href="/create"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-neutral-200"
              >
                Create a League
              </Link>
            </div>
          </div>
        </main>
      </BrandBackground>
    );
  }

  return (
    <BrandBackground>
      <SavedLeagueSelector
        leagues={savedLeagues}
        pendingLeagueId={pendingLeagueId}
        message={message}
        onEnterLeague={(league) => void enterLeague(league)}
        onRemoveLeague={(leagueId) => {
          removeSavedLeague(leagueId);
          setSavedLeagues(getSavedLeagues());
        }}
        subtitle="Saved leagues on this phone."
      />
    </BrandBackground>
  );
}
