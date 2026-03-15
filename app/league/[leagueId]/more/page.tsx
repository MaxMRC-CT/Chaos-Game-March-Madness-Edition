import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWarRoomData } from "@/lib/war-room/get-data";
import { LeagueSidebarNav } from "../_components/LeagueSidebarNav";
import { WarRoomResponse } from "../dashboard/_components/types";

async function loadWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const data = await getWarRoomData(leagueId, { memberId, limit: 10 });
  return data as WarRoomResponse | null;
}

const TOURNAMENT_LINKS = [
  {
    href: "games",
    title: "Games",
    description: "See results by round and completed matchups.",
  },
  {
    href: "bracket",
    title: "Full Bracket",
    description: "Explore the full field and ownership view by region.",
  },
] as const;

const LEAGUE_ACTIONS = [
  {
    href: "/my-leagues",
    title: "Switch League",
    description: "Jump between saved leagues on this device.",
    external: true,
  },
] as const;

function isExternalLink(
  item: (typeof LEAGUE_ACTIONS)[number],
) {
  return "external" in item && Boolean(item.external);
}

export default async function MorePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const initial = await loadWarRoomData(leagueId);

  if (!initial) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  if (!initial.me) {
    redirect(`/join?code=${encodeURIComponent(initial.league.code)}`);
  }

  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
      <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
        <LeagueSidebarNav leagueId={leagueId} showAdmin={Boolean(initial.me?.isAdmin)} />

        <div className="min-w-0 flex-1 space-y-4">
          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-lg shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              More
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              More From Chaos League
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Advanced views, rules, and league utilities live here.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-lg shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Follow the Tournament
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Stay on Top of the Board</h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {TOURNAMENT_LINKS.map((item) => {
                const href = `/league/${leagueId}/${item.href}`;
                return (
                  <Link
                    key={item.title}
                    href={href}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <p className="text-base font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-neutral-400">{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-lg shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Help & Info
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Rules and Quick Guides</h2>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Link
                href="/how-to-play"
                className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <p className="text-base font-semibold text-white">How to Play</p>
                <p className="mt-1 text-sm text-neutral-400">
                  Rules, quick guide, and downloads.
                </p>
              </Link>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/docs/chaos-league-how-to-play.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                >
                  Download Full Guide
                </Link>
                <Link
                  href="/docs/chaos-league-game-card.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                >
                  Download Game Card
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-lg shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              League Actions
            </p>
            <div className="mt-3 space-y-3">
              {LEAGUE_ACTIONS.map((item) => {
                const href = isExternalLink(item) ? item.href : `/league/${leagueId}/${item.href}`;
                return (
                  <Link
                    key={item.title}
                    href={href}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <p className="text-base font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-neutral-400">{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {initial.me?.isAdmin ? (
            <section className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 shadow-lg shadow-black/20">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-200/80">
                Commissioner
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-orange-200">Commissioner Tools</p>
                  <p className="mt-1 text-sm text-orange-100/70">
                    Enter results and manage the league.
                  </p>
                </div>
                <Link
                  href={`/league/${leagueId}/admin/results`}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 text-sm font-medium text-orange-100 transition hover:border-orange-400/30 hover:bg-orange-500/15"
                >
                  Open Tools
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
