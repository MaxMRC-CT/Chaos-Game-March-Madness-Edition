import Image from "next/image";
import Link from "next/link";

const FEATURE_CARDS = [
  {
    title: "Draft your Heroes, Villains, and Cinderellas",
    summary: "Build your portfolio across three archetypes and ride the chaos.",
  },
  {
    title: "Track every round live",
    summary: "Standings update in real time as games finish.",
  },
  {
    title: "Win with leverage, not luck",
    summary: "Strategic picks matter more than guessing outcomes.",
  },
];

export function PrelaunchLanding() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] text-white relative overflow-hidden">
      <div className="absolute inset-0 brand-grain opacity-30" aria-hidden />
      <div className="absolute inset-0 brand-diagonal" aria-hidden />
      <div className="absolute inset-0 brand-vignette pointer-events-none" aria-hidden />

      <div className="relative flex min-h-dvh flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[720px] flex flex-col items-center text-center">
          {/* Hero */}
          <div className="flex flex-col items-center">
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
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Chaos League
            </h1>
            <p className="mt-3 text-xl font-medium text-[#fb6223]/95 sm:text-2xl">
              Draft. Leverage. Chaos.
            </p>
            <p className="mt-5 max-w-[540px] text-base leading-relaxed text-neutral-400">
              A portfolio-based March Madness game where every result moves the
              standings.
            </p>
          </div>

          {/* Beta notice */}
          <div className="mt-10 w-full max-w-[560px] rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-sm font-medium text-amber-200/95">
              Private beta opens tomorrow night.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Read the guide, explore the rules, and get ready to draft.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            <Link
              href="/guide"
              className="rounded-xl bg-[#fb6223] px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#fb6223]/20 transition hover:bg-[#ff7a3d] active:scale-[0.99]"
            >
              How to Play
            </Link>
            <Link
              href="/guide"
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 font-medium text-white backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30 active:scale-[0.99]"
            >
              League Guide / FAQ
            </Link>
            <Link
              href="/my-leagues"
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 font-medium text-white backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30 active:scale-[0.99]"
            >
              My Leagues
            </Link>
          </div>

          {/* Secondary CTA */}
          <Link
            href="/join"
            className="mt-6 text-sm text-neutral-500 transition hover:text-neutral-400"
          >
            Join by PIN →
          </Link>

          {/* How it works strip */}
          <div className="mt-16 sm:mt-20 grid w-full gap-4 sm:grid-cols-3">
            {FEATURE_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm"
              >
                <h3 className="text-sm font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-400">{card.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
