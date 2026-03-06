"use client";

import React from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { createLeague } from "@/lib/actions/league";

function CreateLeagueFormContent() {
  const { pending } = useFormStatus();
  const [name, setName] = React.useState("");

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
      <button
        disabled={pending || !name.trim()}
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
