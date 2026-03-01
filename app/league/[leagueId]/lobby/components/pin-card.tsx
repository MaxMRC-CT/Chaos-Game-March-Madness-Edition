"use client";

import { useState } from "react";

type PinCardProps = {
  pin: string | null | undefined;
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

export function PinCard({ pin }: PinCardProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const displayPin = pin || "—";

  async function handleCopy() {
    if (!pin) return;

    try {
      await copyWithFallback(pin);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <section className="rounded-2xl border p-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Game PIN</p>
      <p className="mt-2 font-mono text-6xl font-bold leading-none tracking-wide">
        {displayPin}
      </p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!pin}
          className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Copy PIN
        </button>
        <p className="h-5 text-sm">
          {status === "copied" ? (
            <span className="text-green-600">Copied!</span>
          ) : status === "error" ? (
            <span className="text-red-600">Copy failed</span>
          ) : null}
        </p>
      </div>
    </section>
  );
}
