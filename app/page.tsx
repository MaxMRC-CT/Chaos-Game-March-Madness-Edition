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
      <label className="block text-sm font-medium">Create a league</label>
      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., WhatsApp Crew 2026"
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-neutral-500"
      />
      <label className="block text-sm font-medium mt-3">Your name</label>
      <input
        name="displayName"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="e.g., Alex"
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-neutral-500"
      />
      <button
        disabled={pending || !name.trim() || !displayName.trim()}
        className="w-full rounded-xl bg-[#fb6223] hover:bg-[#ff7a3d] transition-colors duration-200 text-white py-3 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create League
      </button>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] text-white flex flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-8 shadow-xl space-y-6">
        <div className="relative flex justify-center">
          <Image
            src="/chaos-shield.png"
            alt="Chaos Game"
            width={180}
            height={220}
            priority
            className="transition-transform duration-300 hover:scale-105 drop-shadow-[0_0_20px_rgba(251,98,35,0.45)]"
          />
        </div>
        <h1 className="text-3xl font-semibold text-white text-center mb-6">
          Chaos League
        </h1>
        <p className="text-sm text-neutral-400 text-center -mt-4">
          Kahoot-style March Madness draft game.
        </p>

        <form action={createLeague} className="space-y-3">
          <CreateLeagueFormContent />
        </form>

        <a
          href="/join"
          className="block text-center text-sm text-neutral-400 hover:text-white transition"
        >
          Join with Game PIN
        </a>

        <div className="flex justify-center gap-4 text-sm">
          <a
            href="/my-leagues"
            className="text-neutral-400 hover:text-white transition"
          >
            My Leagues
          </a>
          <a
            href="/guide"
            className="text-neutral-400 hover:text-white transition"
          >
            How to Play
          </a>
        </div>

        <section className="mt-10 border-t border-white/10 pt-8">
          <h2 className="mb-6 text-center text-lg font-medium text-white">
            How Chaos League Works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <p className="font-medium text-white">1. Draft Your Portfolio</p>
              <p className="mt-1 text-sm text-neutral-400">
                Pick 2 Heroes, 2 Villains, 2 Cinderellas. No bracket to fill.
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-white">2. Track Every Game</p>
              <p className="mt-1 text-sm text-neutral-400">
                Points update live as the tournament unfolds. Rivalries matter.
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-white">3. Outscore Your League</p>
              <p className="mt-1 text-sm text-neutral-400">
                Win with leverage and chaos. Tiebreaker is championship total.
              </p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <a
              href="/guide"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Read Full Guide →
            </a>
          </div>
        </section>

        {process.env.NODE_ENV === "development" && (
          <a
            href="/dev"
            className="block text-center text-sm text-neutral-400 hover:text-white transition"
          >
            Dev Control Center
          </a>
        )}
      </div>
    </main>
  );
}
