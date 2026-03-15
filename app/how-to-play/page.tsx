import Link from "next/link";

const sections = [
  {
    title: "What is Chaos League?",
    body:
      "Chaos League is a March Madness game where every player drafts a mix of favorites, targets, and upset threats. Your job is to build a portfolio that scores from the bracket's order and the tournament's chaos.",
  },
  {
    title: "Heroes, Villains, and Cinderellas",
    body:
      "Heroes are your reliable point-builders. Villains score when strong teams get knocked out. Cinderellas cash in when underdogs keep dancing. You are always balancing safety, leverage, and chaos.",
  },
  {
    title: "Start at Home",
    body:
      "Your Home screen is the fastest way to orient yourself. It shows your rank, points, team snapshot, the latest chaos, and tournament progress. Start there before diving deeper.",
  },
  {
    title: "Where to Go in the App",
    body:
      "Home gives the quick summary. Standings shows the full leaderboard. My Team shows your Heroes, Villains, and Cinderellas. Games shows results by round. More holds advanced views, rules, and league utilities.",
  },
  {
    title: "Rejoining the League",
    body:
      "Chaos League now remembers your device, so you usually do not need a reconnect code. Join once on your phone, then return later on the same device to jump back into your saved league.",
  },
  {
    title: "During the Tournament",
    body:
      "Check Home first for the latest movement, then open Games when you want round-by-round results. If you want deeper context, use Standings, My Team, and More without getting overloaded up front.",
  },
  {
    title: "How You Win",
    body:
      "You win by outscoring the rest of the league across the tournament. The best portfolios blend dependable Heroes, explosive Villains, and timely Cinderellas while surviving the wild swings of March.",
  },
] as const;

export default function HowToPlayPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0c1424] via-[#0f1726] to-[#0b1120] text-white">
      <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6">
        <section className="rounded-3xl border border-[#fb6223]/20 bg-neutral-950/80 p-5 sm:p-6 shadow-2xl shadow-black/30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08d]">
            Chaos League Guide
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How to Play Chaos League
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300 sm:text-base">
            A mobile-first guide to how the game works, where to go in the app, and how to stay on top of the tournament without getting overloaded.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <GuideBadge>Start at Home</GuideBadge>
            <GuideBadge>Track chaos quickly</GuideBadge>
            <GuideBadge>Use device re-entry</GuideBadge>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-neutral-950/85 p-4 shadow-lg shadow-black/20"
            >
              <h2 className="text-[17px] font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-[13px] leading-6 text-neutral-300">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-neutral-950/85 p-5 sm:p-6 shadow-lg shadow-black/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Downloadable Guides
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Take the rules with you</h2>
          <p className="mt-2 text-sm text-neutral-300">
            Open the full PDF guide when you want the complete explanation, or use the game card for a quick reminder during the tournament.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/docs/chaos-league-how-to-play.pdf"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-center rounded-2xl bg-[#fb6223] px-4 text-sm font-semibold text-white transition hover:bg-[#e35a20]"
            >
              Download Full Guide PDF
            </Link>
            <Link
              href="/docs/chaos-league-game-card.pdf"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 px-4 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-800"
            >
              Download Chaos Game Card PDF
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function GuideBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-200">
      {children}
    </span>
  );
}
