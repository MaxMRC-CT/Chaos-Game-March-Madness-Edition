"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

type ShareLeagueButtonProps = {
  leaguePin: string | null | undefined;
  variant?: "card" | "chip";
};

async function copyInviteText(value: string) {
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

export function ShareLeagueButton({
  leaguePin,
  variant = "card",
}: ShareLeagueButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");

  const inviteText = leaguePin
    ? `Join my Chaos League!\n\nLeague PIN: ${leaguePin}\nCreate your team here:\n${
        typeof window !== "undefined" ? `${window.location.origin}/join` : "/join"
      }`
    : "";

  function flashStatus(next: "copied" | "shared" | "error") {
    setStatus(next);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function handleShare() {
    if (!inviteText) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Chaos League",
          text: inviteText,
        });
        flashStatus("shared");
        return;
      } catch {
        // Fall back to clipboard if the native share flow is unavailable or dismissed.
      }
    }

    try {
      await copyInviteText(inviteText);
      flashStatus("copied");
    } catch {
      flashStatus("error");
    }
  }

  if (variant === "chip") {
    const chipLabel =
      status === "copied"
        ? "Copied!"
        : status === "shared"
          ? "Shared!"
          : status === "error"
            ? "Try again"
            : "Share League";

    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={!leaguePin}
        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#fb6223]/25 bg-[#fb6223]/12 px-3 text-xs font-medium text-[#ffd0bb] transition hover:bg-[#fb6223]/18 disabled:opacity-50"
      >
        {status === "copied" || status === "shared" ? (
          <Check className="size-3.5 text-emerald-300" />
        ) : (
          <Share2 className="size-3.5" />
        )}
        {chipLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleShare}
        disabled={!leaguePin}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#fb6223]/25 bg-[#fb6223]/12 px-4 py-2.5 text-sm font-medium text-[#ffd0bb] transition hover:bg-[#fb6223]/18 disabled:opacity-50"
      >
        {status === "copied" || status === "shared" ? (
          <Check className="size-4 text-emerald-300" />
        ) : (
          <Share2 className="size-4" />
        )}
        Share League
      </button>
      <p
        className={`min-h-4 text-xs ${
          status === "error"
            ? "text-red-400"
            : status === "copied"
              ? "text-emerald-300"
              : status === "shared"
                ? "text-emerald-300"
                : "text-transparent"
        }`}
      >
        {status === "copied"
          ? "Invite copied!"
          : status === "shared"
            ? "Invite ready to send!"
            : status === "error"
              ? "Could not share right now"
              : "."}
      </p>
    </div>
  );
}
