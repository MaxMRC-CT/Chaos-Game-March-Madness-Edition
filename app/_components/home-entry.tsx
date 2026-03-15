"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import JoinLeague from "@/components/join-league";
import { SavedLeagueSelector } from "@/components/saved-league-selector";
import {
  getSavedLeagues,
  removeSavedLeague,
  type SavedLeagueSession,
} from "@/lib/client/device-session";

export function HomeEntry() {
  const router = useRouter();
  const [savedLeagues, setSavedLeagues] = useState<SavedLeagueSession[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingLeagueId, setPendingLeagueId] = useState<string | null>(null);

  const loadSavedLeagues = useCallback(() => {
    setSavedLeagues(getSavedLeagues());
  }, []);

  useLayoutEffect(() => {
    loadSavedLeagues();
  }, [loadSavedLeagues]);

  const enterLeague = useCallback(
    async (league: SavedLeagueSession) => {
      setPendingLeagueId(league.leagueId);
      setMessage(null);

      try {
        const response = await fetch("/api/device-reconnect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leagueId: league.leagueId,
            playerId: league.playerId,
          }),
        });

        if (!response.ok) {
          removeSavedLeague(league.leagueId);
          const fallbackMessage =
            response.status === 404
              ? `${league.leagueName} is no longer available on this device.`
              : "Could not reconnect. Please join again.";
          setMessage(fallbackMessage);
          setSavedLeagues(getSavedLeagues());
          return;
        }

        router.replace(`/league/${league.leagueId}/dashboard`);
      } catch {
        setMessage("Could not reconnect right now. Please try again.");
      } finally {
        setPendingLeagueId(null);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!savedLeagues) return;
    if (savedLeagues.length !== 1) return;
    if (pendingLeagueId) return;

    void enterLeague(savedLeagues[0]);
  }, [enterLeague, pendingLeagueId, savedLeagues]);

  if (!savedLeagues || pendingLeagueId) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] px-6 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center backdrop-blur-md">
          <p className="text-lg font-semibold text-white">Resuming your league…</p>
          <p className="mt-2 text-sm text-neutral-400">
            Checking this device and jumping back in.
          </p>
        </div>
      </main>
    );
  }

  if (savedLeagues.length > 1) {
    return (
      <SavedLeagueSelector
        leagues={savedLeagues}
        pendingLeagueId={pendingLeagueId}
        message={message}
        onEnterLeague={(league) => void enterLeague(league)}
        onRemoveLeague={(leagueId) => {
          removeSavedLeague(leagueId);
          setSavedLeagues(getSavedLeagues());
        }}
      />
    );
  }

  return <JoinLeague initialMessage={message} />;
}
