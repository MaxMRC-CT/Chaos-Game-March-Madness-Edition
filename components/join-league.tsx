"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HowToPlayLinks } from "@/components/how-to-play-links";
import { joinLeague, reconnectMember } from "@/lib/actions/league";
import {
  ensureDeviceSessionId,
  getMostRecentLeague,
  getSavedLeagues,
  upsertSavedLeague,
} from "@/lib/client/device-session";

const ALLOW_BETA_JOIN_AFTER_START = process.env.NEXT_PUBLIC_ALLOW_BETA_JOIN_AFTER_START === "true";

type AvailabilityState =
  | { tone: "neutral"; message: string }
  | { tone: "green"; message: string }
  | { tone: "red"; message: string };

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

  const [code, setCode] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [reconnectCode, setReconnectCode] = React.useState("");
  const [availability, setAvailability] = React.useState<AvailabilityState>({
    tone: "neutral",
    message: "",
  });
  const [leagueStatus, setLeagueStatus] = React.useState<LeagueStatus | null>(null);
  const [message, setMessage] = React.useState<string | null>(initialMessage);
  const [showReconnectForm, setShowReconnectForm] = React.useState(false);
  const [savedLeagueCount, setSavedLeagueCount] = React.useState(0);
  const [mostRecentLeagueName, setMostRecentLeagueName] = React.useState<string | null>(null);

  const nicknameRef = React.useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    nicknameRef.current?.focus();
  }, []);

  React.useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const leagues = getSavedLeagues();
      setSavedLeagueCount(leagues.length);
      setMostRecentLeagueName(getMostRecentLeague()?.leagueName ?? null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    const pinFromQuery = String(searchParams.get("pin") || searchParams.get("code") || "").trim();
    if (/^\d{5,6}$/.test(pinFromQuery)) {
      setCode(pinFromQuery);
    }
  }, [searchParams]);

  React.useEffect(() => {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setLeagueStatus(null);
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
          return;
        }

        const data = await response.json();
        if (!data.leagueId) {
          setLeagueStatus(null);
          return;
        }

        const status = data.status as LeagueStatus | undefined;
        setLeagueStatus(status ?? null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setLeagueStatus(null);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [code]);

  React.useEffect(() => {
    const statusClosesJoin =
      leagueStatus === "LOCKED" ||
      leagueStatus === "DRAFT" ||
      leagueStatus === "LIVE" ||
      leagueStatus === "COMPLETE";

    if (statusClosesJoin && !ALLOW_BETA_JOIN_AFTER_START) {
      setAvailability({
        tone: "red",
        message: "Joining is closed for this league.",
      });
      return;
    }

    const trimmedCode = code.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedCode || !/^\d{6}$/.test(trimmedCode) || !trimmedNickname) {
      setAvailability({ tone: "neutral", message: "" });
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

        if (data.available) {
          setAvailability({ tone: "green", message: "Nickname available" });
          return;
        }

        setAvailability({
          tone: "red",
          message: data.reason === "Game PIN not found" ? "Game PIN not found" : "Nickname already taken",
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setAvailability({ tone: "red", message: "Could not check nickname" });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [code, nickname, leagueStatus]);

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

  const showAvailability = availability.message && availability.message !== "Checking...";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] p-5 text-white">
      <div className="relative flex justify-center">
        <Image
          src="/chaos-shield.png"
          alt="Chaos League"
          width={96}
          height={96}
          className="drop-shadow-[0_0_20px_rgba(251,98,35,0.4)]"
          priority
        />
      </div>

      <div className="space-y-0.5 text-center">
        <p className="mx-auto inline-flex rounded-full border border-[#fb6223]/30 bg-[#fb6223]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffb08d]">
          March Madness 2026
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">CHAOS LEAGUE</h1>
        <p className="text-sm text-neutral-400">Enter your Game PIN to join the league.</p>
      </div>

      {message ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {message}
        </div>
      ) : null}

      <form
        action={joinFormAction}
        className="space-y-4 rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.32)] ring-1 ring-white/5 backdrop-blur-md"
      >
        {joinClosed ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            This league has already started. Use a saved league or reconnect instead.
          </p>
        ) : null}

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-neutral-200">Game PIN</label>
          <input
            name="code"
            inputMode="numeric"
            placeholder="6-digit PIN"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-neutral-200">Nickname</label>
          <input
            ref={nicknameRef}
            name="nickname"
            placeholder="How your league will see you"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
        </div>

        {availability.message === "Checking..." ? (
          <p className="text-sm text-neutral-500">Checking nickname...</p>
        ) : showAvailability ? (
          <p className={`text-sm ${availability.tone === "green" ? "text-green-400" : "text-red-400"}`}>
            {availability.message}
          </p>
        ) : null}

        <button
          disabled={joinPending || joinClosed}
          className="w-full rounded-xl bg-[#fb6223] py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(251,98,35,0.22)] transition-colors duration-200 hover:bg-[#ff7a3d] disabled:opacity-60"
        >
          {joinPending ? "Joining..." : "Join League"}
        </button>

        {joinState?.error ? <p className="text-sm text-red-400">{joinState.error}</p> : null}
        {joinState?.success ? (
          <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-3">
            <p className="text-sm text-green-300">Joining your league…</p>
          </div>
        ) : null}
      </form>

      {savedLeagueCount > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffb08d]">
            Saved League
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Reconnect to a saved league</h2>
          <p className="mt-1 text-sm text-neutral-300">
            {savedLeagueCount === 1 && mostRecentLeagueName
              ? `This device already knows ${mostRecentLeagueName}.`
              : "This device already has saved league access."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={savedLeagueCount === 1 ? "/" : "/my-leagues"}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15"
            >
              {savedLeagueCount === 1 ? "Resume Saved League" : "Choose Saved League"}
            </Link>
            <button
              type="button"
              onClick={() => setShowReconnectForm((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              {showReconnectForm ? "Hide Reconnect Code" : "Use Reconnect Code"}
            </button>
          </div>
        </section>
      ) : (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowReconnectForm((current) => !current)}
            className="text-sm text-neutral-500 underline underline-offset-4 transition hover:text-neutral-300"
          >
            Have a reconnect code?
          </button>
        </div>
      )}

      {showReconnectForm ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md">
          <p className="text-sm text-neutral-400">Reconnect with your Game PIN, nickname, and reconnect code.</p>

          <form action={reconnectFormAction} className="space-y-3">
            <input
              name="code"
              inputMode="numeric"
              placeholder="Game PIN (6 digits)"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <input
              name="nickname"
              placeholder="Nickname"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <input
              name="reconnectCode"
              placeholder="Reconnect Code (XXXX-XXXX)"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 uppercase text-white focus:outline-none focus:ring-2 focus:ring-[#fb6223]"
              value={reconnectCode}
              onChange={(event) => setReconnectCode(event.target.value.toUpperCase())}
            />
            <input type="hidden" name="deviceToken" value="" />
            <button
              disabled={reconnectPending}
              className="w-full rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/15 disabled:opacity-60"
            >
              {reconnectPending ? "Reconnecting..." : "Reconnect"}
            </button>
          </form>

          {reconnectState?.error ? <p className="text-sm text-red-400">{reconnectState.error}</p> : null}
        </div>
      ) : null}

      <HowToPlayLinks
        variant="compact"
        title="New to Chaos League?"
        description="Read the 2-minute guide before joining so you know how the game works and where to go once you're in."
      />

      <div className="flex flex-col items-center gap-2 text-center text-sm">
        <Link
          href="/create"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-700 bg-transparent px-4 text-neutral-300 transition hover:border-neutral-500 hover:text-white"
        >
          Create League
        </Link>
        <Link
          href="/how-to-play"
          className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-neutral-500 transition hover:text-neutral-300"
        >
          How to Play
        </Link>
      </div>
    </main>
  );
}
