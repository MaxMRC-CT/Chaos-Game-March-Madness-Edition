import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HowToPlayLinks } from "@/components/how-to-play-links";
import { getWarRoomData } from "@/lib/war-room/get-data";
import { LeagueSidebarNav } from "../_components/LeagueSidebarNav";
import { WarRoomResponse } from "../dashboard/_components/types";

async function loadWarRoomData(leagueId: string): Promise<WarRoomResponse | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const data = await getWarRoomData(leagueId, { memberId, limit: 10 });
  return data as WarRoomResponse | null;
}

const MORE_LINKS = [
  {
    href: "war-room",
    title: "War Room",
    description: "Advanced league activity, chaos feed, and commissioner view.",
    tone: "primary",
  },
  {
    href: "bracket",
    title: "Full Bracket",
    description: "Explore the full field and ownership view by region.",
    tone: "primary",
  },
  {
    href: "/how-to-play",
    title: "How to Play",
    description: "Rules, app navigation, and a clean game overview.",
    external: true,
    tone: "reference",
  },
  {
    href: "/my-leagues",
    title: "Switch League",
    description: "Jump between saved leagues on this device.",
    external: true,
    tone: "reference",
  },
] as const;

function isExternalLink(item: (typeof MORE_LINKS)[number]) {
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

          <HowToPlayLinks
            variant="compact"
            title="How to Play"
            description="Open the web guide or download the PDFs when you need the full rules, app map, or a quick game card."
          />

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-lg shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Go Next
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Primary Views</h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {MORE_LINKS.filter((item) => item.tone === "primary").map((item) => {
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

          <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-lg shadow-black/20">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              References
            </p>
            <div className="mt-3 space-y-3">
              {MORE_LINKS.filter((item) => item.tone === "reference").map((item) => {
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
