"use client";

import React from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { createLeague } from "@/lib/actions/league";

function CreateLeagueFormContent() {
  const { pending } = useFormStatus();
  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");

  return (
    <>
      <label
        htmlFor="league-name"
        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400"
      >
        League name
      </label>
      <input
        id="league-name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., WhatsApp Crew 2026"
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-neutral-500 focus:border-[#fb6223]/60 focus:outline-none focus:ring-2 focus:ring-[#fb6223]/20 transition-all"
      />
      <label
        htmlFor="your-name"
        className="mb-1.5 mt-4 block text-xs font-medium uppercase tracking-wider text-neutral-400"
      >
        Your name
      </label>
      <input
        id="your-name"
        name="displayName"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="e.g., Alex"
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-neutral-500 focus:border-[#fb6223]/60 focus:outline-none focus:ring-2 focus:ring-[#fb6223]/20 transition-all"
      />
      <button
        type="submit"
        disabled={pending || !name.trim() || !displayName.trim()}
        className="mt-6 w-full rounded-xl bg-[#fb6223] py-3.5 font-semibold text-white shadow-lg shadow-[#fb6223]/20 transition-all duration-200 hover:bg-[#ff7a3d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#fb6223] disabled:active:scale-100"
      >
        {pending ? "Creating…" : "Create League"}
      </button>
    </>
  );
}

const FEATURE_PILLS = [
  "Your Heroes, Villains, and Cinderellas",
  "Live standings + rivalry swings",
  "Win with leverage, not luck",
];

export function HomePage() {
  return (
    <main className="app-shell relative overflow-hidden bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] text-white">
      <div className="absolute inset-0 brand-grain opacity-30" aria-hidden />
      <div className="absolute inset-0 brand-diagonal" aria-hidden />
      <div
        className="absolute inset-0 brand-vignette pointer-events-none"
        aria-hidden
      />

      <div className="app-shell app-safe-top app-safe-bottom relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1180px]">
          {/* Hero: two-column on desktop, stacked on mobile */}
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            {/* Left: brand / pitch panel */}
            <div className="flex max-w-[480px] flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-6">
                <Image
                  src="/chaos-shield.png"
                  alt="Chaos League"
                  width={120}
                  height={147}
                  priority
                  className="drop-shadow-[0_0_24px_rgba(251,98,35,0.4)]"
                />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Chaos League
              </h1>
              <p className="mt-3 text-xl font-medium text-[#fb6223]/95">
                Draft. Leverage. Chaos.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                A portfolio-based March Madness league where every game shifts
                the standings.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start">
                {FEATURE_PILLS.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-neutral-300"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: action card */}
            <div className="w-full max-w-[400px] shrink-0">
              <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-8 shadow-xl shadow-black/20 backdrop-blur-md">
                <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                  Create a league
                </h2>
                <form action={createLeague} className="space-y-0">
                  <CreateLeagueFormContent />
                </form>
                <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6">
                  <a
                    href="/join"
                    className="text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    Join with Game PIN
                  </a>
                  <a
                    href="/my-leagues"
                    className="text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    My Leagues
                  </a>
                  <a
                    href="/guide"
                    className="text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    How to Play
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom info strip */}
          <div className="mt-12 flex flex-col items-center gap-4 text-center sm:mt-16">
            <p className="max-w-[540px] text-sm text-neutral-500">
              Draft your Heroes, Villains, and Cinderellas. Track every round
              live. Win with leverage.
            </p>
            <a
              href="/guide"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            >
              Read Full Guide
              <span className="text-neutral-500" aria-hidden>
                →
              </span>
            </a>
          </div>

          {/* Dev link */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-12 flex justify-center">
              <a
                href="/dev"
                className="text-xs text-neutral-500 transition-colors hover:text-neutral-400"
              >
                Dev Control Center
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
