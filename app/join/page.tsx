"use client";

import * as React from "react";
import { useActionState } from "react";
import { joinLeague, reconnectMember } from "@/lib/actions/league";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type AvailabilityState =
  | { tone: "neutral"; message: string }
  | { tone: "green"; message: string }
  | { tone: "red"; message: string };

type JoinMode = "join" | "reconnect";

export default function JoinPage() {
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
  const nicknameRef = React.useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  React.useEffect(() => {
    nicknameRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const codeFromQuery = String(searchParams.get("code") || "").trim();
    if (/^\d{6}$/.test(codeFromQuery)) {
      setCode(codeFromQuery);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (mode !== "join") {
      return;
    }

    const trimmedCode = code.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedCode) {
      setAvailability({ tone: "neutral", message: "Enter Game PIN" });
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
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

        if (!response.ok) {
          throw new Error("Nickname check failed");
        }

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
        if ((error as Error).name === "AbortError") {
          return;
        }
        setAvailability({ tone: "red", message: "Could not check availability" });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [code, nickname, mode]);

  React.useEffect(() => {
    if (mode !== "reconnect") {
      return;
    }

    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
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
          setResolvedLeagueId(null);
          setAutoDeviceToken(null);
          return;
        }

        const data = await response.json();
        if (!data.leagueId) {
          setResolvedLeagueId(null);
          setAutoDeviceToken(null);
          return;
        }

        const leagueId = String(data.leagueId);
        setResolvedLeagueId(leagueId);
        const storedToken = window.localStorage.getItem(`chaos_${leagueId}_deviceToken`);
        setAutoDeviceToken(storedToken || null);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        setResolvedLeagueId(null);
        setAutoDeviceToken(null);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [code, mode]);

  React.useEffect(() => {
    if (!joinState?.success || !joinState.leagueId || !joinState.deviceToken) {
      return;
    }

    window.localStorage.setItem(
      `chaos_${joinState.leagueId}_deviceToken`,
      joinState.deviceToken,
    );
  }, [joinState]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Join League</h1>
        <p className="text-sm text-neutral-600">
          Enter the 6-digit Game PIN and your nickname.
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-xl border p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-lg px-3 py-2 ${
            mode === "join" ? "bg-black text-white" : "text-neutral-700"
          }`}
        >
          Join
        </button>
        <button
          type="button"
          onClick={() => setMode("reconnect")}
          className={`rounded-lg px-3 py-2 ${
            mode === "reconnect" ? "bg-black text-white" : "text-neutral-700"
          }`}
        >
          Reconnect
        </button>
      </div>

      {mode === "join" ? (
        <form action={joinFormAction} className="space-y-3 rounded-xl border p-4">
          <input
            name="code"
            inputMode="numeric"
            placeholder="Game PIN (6 digits)"
            className="w-full rounded-lg border px-3 py-2"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <input
            ref={nicknameRef}
            name="nickname"
            placeholder="Nickname"
            className="w-full rounded-lg border px-3 py-2"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          <p
            className={`text-sm ${
              availability.tone === "green"
                ? "text-green-600"
                : availability.tone === "red"
                  ? "text-red-600"
                  : "text-neutral-600"
            }`}
          >
            {availability.message}
          </p>

          <button
            disabled={joinPending}
            className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {joinPending ? "Joining..." : "Join"}
          </button>

          {joinState?.error ? <p className="text-sm text-red-600">{joinState.error}</p> : null}
          {joinState?.success && joinState.reconnectCode && joinState.leagueId ? (
            <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                Save this reconnect code:{" "}
                <span className="font-mono font-semibold">{joinState.reconnectCode}</span>
              </p>
              <Link
                href={`/league/${joinState.leagueId}/lobby`}
                className="inline-block rounded-lg bg-black px-3 py-2 text-sm text-white"
              >
                Continue to Lobby
              </Link>
            </div>
          ) : null}
        </form>
      ) : (
        <div className="space-y-3 rounded-xl border p-4">
          <form action={reconnectFormAction} className="space-y-3">
            <input
              name="code"
              inputMode="numeric"
              placeholder="Game PIN (6 digits)"
              className="w-full rounded-lg border px-3 py-2"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <input
              ref={nicknameRef}
              name="nickname"
              placeholder="Nickname"
              className="w-full rounded-lg border px-3 py-2"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <input
              name="reconnectCode"
              placeholder="Reconnect Code (XXXX-XXXX)"
              className="w-full rounded-lg border px-3 py-2 uppercase"
              value={reconnectCode}
              onChange={(event) => setReconnectCode(event.target.value.toUpperCase())}
            />
            <input type="hidden" name="deviceToken" value="" />
            <button
              disabled={reconnectPending}
              className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
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
                className="w-full rounded-lg border px-4 py-2 text-sm disabled:opacity-60"
              >
                Reconnect Automatically
              </button>
            </form>
          ) : null}

          {reconnectState?.error ? (
            <p className="text-sm text-red-600">{reconnectState.error}</p>
          ) : null}
        </div>
      )}

      <Link href="/" className="text-center text-sm text-neutral-600 underline">
        Back
      </Link>
    </main>
  );
}
