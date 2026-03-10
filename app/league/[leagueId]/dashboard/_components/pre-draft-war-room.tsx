"use client";

import { motion } from "framer-motion";
import { Copy, Flame, LayoutGrid, Settings, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import { BrandLockup } from "@/app/(dashboard)/_components/BrandLockup";
import { startTournamentFromForm } from "@/lib/actions/league";
import DashboardClient from "./dashboard-client";
import { LiveFeed } from "./live-feed";
import { WarRoomResponse } from "./types";

type ActionState = { error?: string } | null;

export function PreDraftWarRoom({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: WarRoomResponse;
}) {
  const [data, setData] = useState<WarRoomResponse>(initial);
  const [copied, setCopied] = useState(false);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    startTournamentFromForm,
    null,
  );

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/war-room?leagueId=${leagueId}&limit=15&mode=all`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const payload = (await response.json()) as WarRoomResponse;
    setData(payload);
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [load]);

  const isSetup = data.league.status === "SETUP";
  const isLocked = data.league.status === "LOCKED";
  const isHost = Boolean(data.me?.isAdmin);

  if (data.league.status === "LIVE" || data.league.status === "COMPLETE") {
    return <DashboardClient leagueId={leagueId} initial={data} />;
  }

  async function copyPin() {
    try {
      await navigator.clipboard.writeText(data.league.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const initials = (data.me?.displayName || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-dvh text-neutral-100">
      <div className="mx-auto flex max-w-[1600px] gap-4 p-4">
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[240px] shrink-0 rounded-xl border border-[#1f2937] bg-[#111827] p-4 lg:block">
          <BrandLockup />
          <nav className="mt-4 space-y-1 text-sm">
            <NavItem href={`/league/${leagueId}/dashboard`} active icon={<Shield className="size-[18px]" />}>
              War Room
            </NavItem>
            <NavItem href={`/league/${leagueId}/bracket`} icon={<LayoutGrid className="size-[18px]" />}>
              Full Bracket
            </NavItem>
            <NavItem href={`/league/${leagueId}/standings`} icon={<Flame className="size-[18px]" />}>
              My League
            </NavItem>
            {data.me?.isAdmin ? (
              <NavItem href={`/league/${leagueId}/admin/results`} icon={<Settings className="size-[18px]" />}>
                Admin
              </NavItem>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {/* Hero card */}
          <header className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 transition duration-200 hover:bg-[#131c2a] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
                  {data.league.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                    {isSetup
                      ? "Build your roster (2 Heroes, 2 Villains, 2 Cinderellas)"
                      : "Picks locked — tournament goes live 60 min before first tip-off"}
                  </span>
                  {data.league.lockDeadline && isSetup ? (
                    <span className="rounded-full border border-neutral-600 bg-neutral-800/60 px-2 py-0.5 text-xs text-neutral-400">
                      Picks lock at{" "}
                      {new Date(data.league.lockDeadline).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}{" "}
                      ET
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 font-mono text-sm font-semibold text-neutral-100">
                    {data.league.code}
                  </span>
                  <button
                    type="button"
                    onClick={copyPin}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
                  >
                    <Copy className="size-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <Link
                    href={`/join?code=${encodeURIComponent(data.league.code)}`}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                  >
                    Share
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {isSetup ? (
                    <Link
                      href={`/league/${leagueId}/portfolio`}
                      className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                    >
                      Build roster
                    </Link>
                  ) : null}
                  {isLocked ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
                      Picks locked — tournament goes live 60 min before first tip-off
                    </span>
                  ) : null}
                  {isSetup && isHost ? (
                    <form action={formAction} className="inline">
                      <input type="hidden" name="leagueId" value={leagueId} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-500 disabled:opacity-60"
                      >
                        {pending ? "Starting…" : "Force start now"}
                      </button>
                      {state?.error ? (
                        <p className="mt-2 text-sm text-red-400">{state.error}</p>
                      ) : null}
                    </form>
                  ) : (isSetup || isLocked) && !isHost ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {isLocked ? "Picks locked — waiting for live" : "Waiting for host or auto-start"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 font-semibold text-neutral-100">
                  {initials}
                </span>
                <p className="text-sm text-neutral-300">{data.me?.displayName || "Guest"}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Players in Lobby */}
            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-3 sm:p-4">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-100 sm:text-lg">
                <Users className="size-4" />
                Players in Lobby
              </h2>
              <p className="mb-3 text-xs text-neutral-400">{data.members.length} players</p>
              <ul className="max-h-[200px] space-y-2 overflow-y-auto">
                {data.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-[#1f2937] bg-[#0f1623] px-3 py-2 text-sm"
                  >
                    <span className="text-neutral-100">{m.displayName || "Unknown"}</span>
                    {m.isAdmin ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                        League Manager
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">Player</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Roster format */}
            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-3 sm:p-4">
              <h2 className="mb-3 text-base font-semibold text-neutral-100 sm:text-lg">Roster (2/2/2)</h2>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li className="flex items-start gap-2 rounded-lg border border-[#1f2937] bg-[#0f1623] px-3 py-2">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                  <span>
                    <strong className="text-blue-200">Hero</strong> — High seeds you root for. Win = points.
                  </span>
                </li>
                <li className="flex items-start gap-2 rounded-lg border border-[#1f2937] bg-[#0f1623] px-3 py-2">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  <span>
                    <strong className="text-red-200">Villain</strong> — Teams you want eliminated. Out = points.
                  </span>
                </li>
                <li className="flex items-start gap-2 rounded-lg border border-[#1f2937] bg-[#0f1623] px-3 py-2">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                  <span>
                    <strong className="text-violet-200">Cinderella</strong> — Underdogs that punch above their seed.
                  </span>
                </li>
              </ul>
            </section>
          </div>

          {/* Recent Activity */}
          <section id="activity">
            <LiveFeed
              allEvents={data.recentEvents}
              highlightEvents={data.highlightEvents}
              picks={data.picks}
              members={data.members}
              teams={data.teams}
              ownershipByRole={data.ownershipByRole}
              limit={10}
              compact
              maxHeightClass="max-h-[260px]"
              showFilters={false}
              title="Recent activity"
              subtitle="Last 10 events"
              linkToFeed
              linkToFeedHref={`/league/${leagueId}/standings?tab=feed`}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function NavItem({
  href,
  active = false,
  icon,
  children,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const MotionLink = motion(Link);
  return (
    <MotionLink
      href={href}
      whileHover={{ scale: 1.01 }}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 transition duration-200 ${
        active
          ? "bg-gradient-to-r from-white/8 to-transparent bg-white/5 text-white shadow-[0_0_20px_rgba(251,98,35,0.08)]"
          : "text-neutral-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active ? (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-orange-400 to-violet-400"
          style={{ boxShadow: "0 0 8px rgba(251,98,35,0.4)" }}
        />
      ) : null}
      <span className="relative flex shrink-0">{icon}</span>
      {children}
    </MotionLink>
  );
}
