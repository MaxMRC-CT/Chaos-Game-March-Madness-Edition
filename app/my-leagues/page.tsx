import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";
import {
  getLeaguesFromCookiePairs,
  parseMemberCookies,
} from "@/lib/my-leagues/get-leagues-from-cookies";

function formatStatus(status: string) {
  const map: Record<string, string> = {
    SETUP: "Lobby",
    LOCKED: "Locked",
    DRAFT: "Draft",
    LIVE: "Live",
    COMPLETE: "Final",
  };
  return map[status] ?? status;
}

function getStatusClass(status: string) {
  if (status === "LIVE")
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "COMPLETE")
    return "bg-neutral-500/15 text-neutral-200 border-neutral-500/30";
  return "bg-amber-500/15 text-amber-200 border-amber-500/30";
}

export default async function MyLeaguesPage() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const pairs = parseMemberCookies(
    all.map((c) => ({ name: c.name, value: c.value ?? "" })),
  );
  const leagues = await getLeaguesFromCookiePairs(pairs);

  return (
    <BrandBackground>
      <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
        <div className="mx-auto max-w-[900px] px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/"
              className="rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <Image
                src="/chaos-shield.png"
                alt="Chaos League"
                width={80}
                height={104}
                className="h-auto w-[60px] sm:w-[80px]"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                My Leagues
              </h1>
              <p className="text-sm text-neutral-400">
                Leagues you&apos;ve joined on this device
              </p>
            </div>
          </div>

          {leagues.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/95 p-8 text-center">
              <p className="text-neutral-300">
                No leagues yet. Create or join one to get started.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Link
                  href="/create"
                  className="rounded-lg bg-[#fb6223] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff7a3d]"
                >
                  Create League
                </Link>
                <Link
                  href="/join"
                  className="rounded-lg border border-neutral-600 bg-neutral-800/50 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 hover:text-white"
                >
                  Join with Game PIN
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {leagues.map((entry) => (
                <Link
                  key={entry.leagueId}
                  href={`/league/${entry.leagueId}/dashboard`}
                  className="group flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/95 p-5 shadow-lg transition hover:border-neutral-700 hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-semibold text-white group-hover:text-violet-200">
                      {entry.league.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusClass(
                        entry.league.status,
                      )}`}
                    >
                      {formatStatus(entry.league.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">
                    PIN: {entry.league.code}
                  </p>
                  <p className="mt-2 text-sm text-neutral-300">
                    You: {entry.member.displayName}
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-violet-400 group-hover:text-violet-300">
                    Open League →
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <Link
              href="/create"
              className="text-neutral-400 hover:text-white"
            >
              Create League
            </Link>
            <Link
              href="/join"
              className="text-neutral-400 hover:text-white"
            >
              Join with Game PIN
            </Link>
            <Link
              href="/guide"
              className="text-neutral-400 hover:text-white"
            >
              How to Play
            </Link>
          </div>
        </div>
      </main>
    </BrandBackground>
  );
}
