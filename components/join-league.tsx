"use client";

import * as React from "react";
import { useActionState } from "react";
import { joinLeague, reconnectMember } from "@/lib/actions/league";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HowToPlayLinks } from "@/components/how-to-play-links";
import {
  ensureDeviceSessionId,
  upsertSavedLeague,
} from "@/lib/client/device-session";

/** Beta override: allow joining even when league is LOCKED/LIVE/etc (e.g. 2025 test data). Disable for 2026 production. */
const ALLOW_BETA_JOIN_AFTER_START = process.env.NEXT_PUBLIC_ALLOW_BETA_JOIN_AFTER_START === "true";

type AvailabilityState =
  | { tone: "neutral"; message: string }
  | { tone: "green"; message: string }
  | { tone: "red"; message: string };

type JoinMode = "join" | "reconnect";
type LeagueStatus = "SETUP" | "LOCKED" | "DRAFT" | "LIVE" | "COMPLETE";

export default function JoinLeague({
  initialMessage = null,
}: {
  initialMessage?: string | null;
}) {
  const [joinState, joinFormAction, joinPending] = useActionState(joinLeague, null);
  const [reconnectState, reconnectFormAction, reconnectPending] = useActionState(
    reconnectMember,
    null,
  );

  const [mode, setMode] = React.useState<JoinMode>("join");
  const [code, setCode] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [reconnectCode, setReconnectCode] = React.useState("");
  const [availability, setAvailability] = React.useState<AvailabilityState>({
    tone: "neutral",
    message: "Enter Game PIN",
  });

  const [resolvedLeagueId, setResolvedLeagueId] = React.useState<string | null>(null);
  const [autoDeviceToken, setAutoDeviceToken] = React.useState<string | null>(null);
  const [leagueStatus, setLeagueStatus] = React.useState<LeagueStatus | null>(null);
  const [message, setMessage] = React.useState<string | null>(initialMessage);

  const nicknameRef = React.useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    nicknameRef.current?.focus();
  }, []);

  React.useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  // Prefill from ?pin= or ?code= query params
  React.useEffect(() => {
    const pinFromQuery = String(searchParams.get("pin") || searchParams.get("code") || "").trim();
    if (/^\d{5,6}$/.test(pinFromQuery)) {
      setCode(pinFromQuery);
    }
  }, [searchParams]);

  // Fetch league status by PIN
  React.useEffect(() => {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setLeagueStatus(null);
      setResolvedLeagueId(null);
      setAutoDeviceToken(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ code: trimmedCode });
        const response = await fetch(`/api/league-by-pin?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          setLeagueStatus(null);
          setResolvedLeagueId(null);
          setAutoDeviceToken(null);
          return;
        }

        const data = await response.json();
        if (!data.leagueId) {
          setLeagueStatus(null);
          setResolvedLeagueId(null);
          setAutoDeviceToken(null);
          return;
        }

        const leagueId = String(data.leagueId);
        const status = data.status as LeagueStatus | undefined;

        setLeagueStatus(status ?? null);
        setResolvedLeagueId(leagueId);

        const storedToken = window.localStorage.getItem(`chaos_${leagueId}_deviceToken`);
        setAutoDeviceToken(storedToken || null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setLeagueStatus(null);
        setResolvedLeagueId(null);
        setAutoDeviceToken(null);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [code]);

  // Auto-switch to reconnect only when joining is closed (LOCKED, DRAFT, LIVE, or COMPLETE) — unless beta override
  React.useEffect(() => {
    const statusClosesJoin =
      leagueStatus === "LOCKED" || leagueStatus === "DRAFT" || leagueStatus === "LIVE" || leagueStatus === "COMPLETE";
    if (statusClosesJoin && !ALLOW_BETA_JOIN_AFTER_START) {
      setMode("reconnect");
    }
  }, [leagueStatus]);

  // Nickname availability check (only when in join mode and joining is allowed)
  React.useEffect(() => {
    if (mode !== "join") return;

    // If league is LOCKED/DRAFT/LIVE/COMPLETE and beta override off, joining is closed
    const statusClosesJoin =
      leagueStatus === "LOCKED" || leagueStatus === "DRAFT" || leagueStatus === "LIVE" || leagueStatus === "COMPLETE";
    if (statusClosesJoin && !ALLOW_BETA_JOIN_AFTER_START) {
      setAvailability({
        tone: "red",
        message: "Joining is closed for this league. Please reconnect.",
      });
      return;
    }

    const trimmedCode = code.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedCode || !/^\d{6}$/.test(trimmedCode)) {
      setAvailability({ tone: "neutral", message: "Enter Game PIN" });
      return;
    }

    if (!trimmedNickname) {
      setAvailability({ tone: "neutral", message: "Enter Nickname" });
      return;
    }

    setAvailability({ tone: "neutral", message: "Checking..." });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          code: trimmedCode,
          nickname: trimmedNickname,
        });

        const response = await fetch(`/api/nickname-available?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Nickname check failed");

        const data = await response.json();

        if (data.reason === "Enter Game PIN" || data.reason === "Enter Nickname") {
          setAvailability({ tone: "neutral", message: data.reason });
          return;
        }

        if (data.available) {
          setAvailability({ tone: "green", message: "Available" });
          return;
        }

        setAvailability({
          tone: "red",
          message: data.reason === "Game PIN not found" ? "Game PIN not found" : "Taken",
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setAvailability({ tone: "red", message: "Could not check availability" });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [code, nickname, mode, leagueStatus]);

  // Store deviceToken after successful join
  React.useEffect(() => {
    if (
      !joinState?.success ||
      !joinState.leagueId ||
      !joinState.deviceToken ||
      !joinState.playerId ||
      !joinState.leagueName ||
      !joinState.leagueCode ||
      !joinState.nickname
    ) {
      return;
    }

    ensureDeviceSessionId();
    window.localStorage.setItem(`chaos_${joinState.leagueId}_deviceToken`, joinState.deviceToken);
    upsertSavedLeague({
      leagueId: joinState.leagueId,
      leagueName: joinState.leagueName,
      leagueCode: joinState.leagueCode,
      playerId: joinState.playerId,
      nickname: joinState.nickname,
    });
    router.replace(`/league/${joinState.leagueId}/dashboard`);
  }, [joinState, router]);

  const joinClosed =
    (leagueStatus === "LOCKED" ||
      leagueStatus === "DRAFT" ||
      leagueStatus === "LIVE" ||
      leagueStatus === "COMPLETE") &&
    !ALLOW_BETA_JOIN_AFTER_START;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6 bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] text-white">
      <div className="relative flex justify-center mb-6">
        <Image
          src="/chaos-shield.png"
          alt="Chaos League"
          width={130}
          height={130}
          className="transition-transform duration-300 hover:scale-105 drop-shadow-[0_0_20px_rgba(251,98,35,0.45)]"
          priority
        />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">CHAOS LEAGUE</h1>
        <p className="text-sm text-neutral-400">Beta Season – 2026</p>
        <p className="text-sm text-neutral-500">Have a Game PIN? Jump right in.</p>
      </div>

      <HowToPlayLinks
        title="New to Chaos League?"
        description="Read the quick guide before joining so you know how the game works and where to go once you're in."
      />

      {message ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/5 p-1 text-sm sm:grid-cols-2 sm:gap-1">
        <button
          type="button"
          onClick={() => !joinClosed && setMode("join")}
          disabled={joinClosed}
          className={`rounded-lg px-3 py-2 ${
            mode === "join"
              ? "bg-[#fb6223] text-white"
              : joinClosed
                ? "cursor-not-allowed text-neutral-400"
                : "text-neutral-400"
          } disabled:opacity-60`}
        >
          Join
        </button>
        <button
          type="button"
          onClick={() => setMode("reconnect")}
          className={`rounded-lg px-3 py-2 ${
            mode === "reconnect" ? "bg-[#fb6223] text-white" : "text-neutral-400"
          }`}
        >
          Reconnect
        </button>
      </div>

      {mode === "join" ? (
        <form action={joinFormAction} className="space-y-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-xl">
          {joinClosed ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              This league has started. Joining is closed. Please reconnect.
            </p>
          ) : null}

          <input
            name="code"
            inputMode="numeric"
            placeholder="Enter Game PIN (6 digits)"
            className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <input
            ref={nicknameRef}
            name="nickname"
            placeholder="Nickname"
            className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />

          <p
            className={`text-sm ${
              availability.tone === "green"
                ? "text-green-400"
                : availability.tone === "red"
                  ? "text-red-400"
                  : "text-neutral-400"
            }`}
          >
            {availability.message}
          </p>

          <button
            disabled={joinPending || joinClosed}
            className="w-full rounded-xl bg-[#fb6223] hover:bg-[#ff7a3d] transition-colors duration-200 text-white py-2 font-medium shadow-lg disabled:opacity-60"
          >
            {joinPending ? "Joining..." : "Join League"}
          </button>

          {joinState?.error ? <p className="text-sm text-red-400">{joinState.error}</p> : null}

          {joinState?.success ? (
            <div className="space-y-3 rounded-lg border border-green-400/30 bg-green-500/10 p-3">
              <p className="text-sm text-green-300">
                Joining your league…
              </p>
            </div>
          ) : null}
        </form>
      ) : (
        <div className="space-y-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-xl">
          {joinClosed ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              This league has started. Joining is closed. Please reconnect.
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Reconnect if you already joined this league on this device.
            </p>
          )}

          <form action={reconnectFormAction} className="space-y-3">
            <input
              name="code"
              inputMode="numeric"
              placeholder="Game PIN (6 digits)"
              className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <input
              ref={nicknameRef}
              name="nickname"
              placeholder="Nickname"
              className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <input
              name="reconnectCode"
              placeholder="Reconnect Code (XXXX-XXXX)"
              className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fb6223] uppercase"
              value={reconnectCode}
              onChange={(event) => setReconnectCode(event.target.value.toUpperCase())}
            />
            <input type="hidden" name="deviceToken" value="" />
            <button
              disabled={reconnectPending}
              className="w-full rounded-xl bg-[#fb6223] hover:bg-[#ff7a3d] transition-colors duration-200 text-white py-2 font-medium shadow-lg disabled:opacity-60"
            >
              {reconnectPending ? "Reconnecting..." : "Reconnect"}
            </button>
          </form>

          {resolvedLeagueId && autoDeviceToken ? (
            <form action={reconnectFormAction}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="nickname" value={nickname} />
              <input type="hidden" name="reconnectCode" value="" />
              <input type="hidden" name="deviceToken" value={autoDeviceToken} />
              <button
                disabled={reconnectPending}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-200 disabled:opacity-60"
              >
                Reconnect Automatically
              </button>
            </form>
          ) : null}

          {reconnectState?.error ? <p className="text-sm text-red-400">{reconnectState.error}</p> : null}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-2 text-center text-sm">
        <Link href="/create" className="text-neutral-400 hover:text-white underline">
          Create League
        </Link>
        <Link href="/how-to-play" className="text-neutral-500 hover:text-neutral-400 text-xs">
          How to Play
        </Link>
      </div>
    </main>
  );
}
