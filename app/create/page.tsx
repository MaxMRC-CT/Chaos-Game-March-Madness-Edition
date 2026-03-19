"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { createLeague } from "@/lib/actions/league";
import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";
import { PlayerTokenField } from "@/components/player-token-field";

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
      <PlayerTokenField />
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

export default function CreatePage() {
  return (
    <BrandBackground>
      <main className="app-shell app-safe-top app-safe-bottom min-w-0 overflow-x-hidden text-neutral-100">
        <div className="mx-auto max-w-[400px] px-4">
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/"
              className="rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <div className="relative aspect-[2/3] w-[60px] sm:w-[80px]">
                <Image
                  src="/chaos-shield.png"
                  alt="Chaos League"
                  fill
                  sizes="(min-width: 640px) 80px, 60px"
                  className="object-contain"
                />
              </div>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Create League
              </h1>
              <p className="text-sm text-neutral-400">
                Start a new Chaos League
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 sm:p-8 shadow-xl shadow-black/20 backdrop-blur-md">
            <form action={createLeague} className="space-y-0">
              <CreateLeagueFormContent />
            </form>
          </div>

          <div className="mt-6 text-center text-sm">
            <Link href="/" className="text-neutral-400 hover:text-white underline">
              Join with Game PIN
            </Link>
          </div>
        </div>
      </main>
    </BrandBackground>
  );
}
