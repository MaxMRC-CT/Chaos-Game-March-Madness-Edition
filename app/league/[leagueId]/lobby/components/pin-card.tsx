"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

type PinCardProps = {
  pin: string | null | undefined;
  leagueName: string;
};

async function copyWithFallback(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function PinCard({ pin, leagueName }: PinCardProps) {
  const [status, setStatus] = useState<
    "idle" | "pin-copied" | "invite-copied" | "shared" | "error"
  >("idle");
  const displayPin = pin || "—";
  const inviteUrl =
    typeof window !== "undefined" && pin
      ? `${window.location.origin}/join?code=${encodeURIComponent(pin)}`
      : "";
  const inviteMessage = pin
    ? `Join my Chaos League: ${leagueName}. Use Game PIN ${pin}.${inviteUrl ? ` ${inviteUrl}` : ""}`
    : "";

  function flashStatus(
    next: "pin-copied" | "invite-copied" | "shared" | "error",
    delay = 1800,
  ) {
    setStatus(next);
    window.setTimeout(() => setStatus("idle"), delay);
  }

  async function handleCopyPin() {
    if (!pin) return;

    try {
      await copyWithFallback(pin);
      flashStatus("pin-copied");
    } catch {
      flashStatus("error", 2200);
    }
  }

  async function handleCopyInvite() {
    if (!inviteMessage) return;

    try {
      await copyWithFallback(inviteMessage);
      flashStatus("invite-copied");
    } catch {
      flashStatus("error", 2200);
    }
  }

  async function handleShare() {
    if (!pin || !inviteMessage) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${leagueName}`,
          text: `Use Game PIN ${pin} to join ${leagueName}.`,
          url: inviteUrl || undefined,
        });
        flashStatus("shared");
        return;
      } catch {
        // Fall through to clipboard for dismissed / failed native share.
      }
    }

    await handleCopyInvite();
  }

  const statusMessage =
    status === "pin-copied"
      ? "Game PIN copied"
      : status === "invite-copied"
        ? "Invite message copied"
        : status === "shared"
          ? "Invite ready to send"
          : status === "error"
            ? "Could not copy right now"
            : null;

  const actionButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50";

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950/85 p-5 text-center shadow-xl shadow-black/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
        League PIN
      </p>
      <p className="mt-3 font-mono text-5xl font-bold leading-none tracking-[0.22em] text-white sm:text-6xl">
        {displayPin}
      </p>
      <p className="mt-3 text-sm text-neutral-400">
        Share this PIN so players can jump into your league fast on game night.
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleCopyPin}
          disabled={!pin}
          className={`${actionButtonClass} border-white/12 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08]`}
        >
          {status === "pin-copied" ? (
            <Check className="size-4 text-emerald-300" />
          ) : (
            <Copy className="size-4" />
          )}
          Copy PIN
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={!pin}
          className={`${actionButtonClass} border-[#fb6223]/30 bg-[#fb6223]/12 text-[#ffd0bb] hover:bg-[#fb6223]/18`}
        >
          <Share2 className="size-4" />
          Share Invite
        </button>
      </div>

      <button
        type="button"
        onClick={handleCopyInvite}
        disabled={!pin}
        className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-neutral-400 transition hover:border-white/15 hover:bg-white/[0.03] hover:text-neutral-200 disabled:opacity-50"
      >
        <Copy className="size-3.5" />
        Copy invite text
      </button>

      <p
        className={`mt-3 h-5 text-sm ${
          status === "error" ? "text-red-400" : statusMessage ? "text-emerald-300" : "text-transparent"
        }`}
      >
        {statusMessage ?? "."}
      </p>

      {inviteUrl ? (
        <p className="mt-1 break-all text-[11px] text-neutral-500">{inviteUrl}</p>
      ) : null}
    </section>
  );
}
