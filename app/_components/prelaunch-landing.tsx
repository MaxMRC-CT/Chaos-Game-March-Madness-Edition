import Image from "next/image";
import Link from "next/link";

const FEATURE_CARDS = [
  {
    title: "Build Your Portfolio",
    summary:
      "Draft your Heroes, Villains, and Cinderellas before tip-off.",
  },
  {
    title: "Track Every Swing",
    summary:
      "Standings move in real time as every round unfolds.",
  },
  {
    title: "Win on Leverage",
    summary:
      "Outmaneuver your league with sharper picks and smarter exposure.",
  },
];

export function PrelaunchLanding() {
  return (
    <main className="app-shell relative overflow-hidden bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] text-white">
      <div className="absolute inset-0 brand-grain opacity-30" aria-hidden />
      <div className="absolute inset-0 brand-diagonal" aria-hidden />
      <div className="absolute inset-0 brand-vignette pointer-events-none" aria-hidden />
      <div className="absolute inset-0 prelaunch-hero-glow pointer-events-none" aria-hidden />

      <div className="app-shell app-safe-top app-safe-bottom relative flex flex-col px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[720px] flex-col items-center text-center">
          {/* Hero */}
          <div className="relative flex flex-col items-center">
            <div className="mb-4">
              <Image
                src="/chaos-shield.png"
                alt="Chaos League"
                width={132}
                height={162}
                priority
                className="drop-shadow-[0_0_32px_rgba(251,98,35,0.45)]"
              />
            </div>
            <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Chaos League
            </h1>
            <p className="mt-2.5 tracking-[0.2em] text-lg font-medium uppercase text-[#fb6223] sm:text-xl">
              Draft. Leverage. Chaos.
            </p>
            <p className="mt-4 max-w-[480px] text-[0.9375rem] leading-relaxed text-neutral-400">
              A private March Madness strategy game where every result shifts the
              board.
            </p>
          </div>

          {/* Beta notice */}
          <div className="mt-8 w-full max-w-[540px] rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-6 py-5 shadow-[0_0_40px_rgba(251,191,36,0.08)] backdrop-blur-sm">
            <p className="text-base font-semibold tracking-tight text-amber-100">
              Private Beta Opens Tomorrow Night
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              The board is set. Learn the rules, study the strategy, and get
              ready to draft.
            </p>
          </div>

          {/* CTA row */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
            <Link
              href="/guide"
              className="w-full rounded-xl bg-[#fb6223] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#fb6223]/25 transition hover:bg-[#ff7a3d] hover:shadow-[#fb6223]/30 active:scale-[0.99] sm:w-auto"
            >
              How to Play
            </Link>
            <Link
              href="/guide"
              className="w-full rounded-xl border border-white/25 bg-white/[0.06] px-6 py-3 text-[0.9375rem] font-medium text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/10 active:scale-[0.99] sm:w-auto"
            >
              League Guide / FAQ
            </Link>
            <Link
              href="/my-leagues"
              className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-[0.9375rem] font-medium text-neutral-300 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/6 hover:text-white active:scale-[0.99] sm:w-auto"
            >
              My Leagues
            </Link>
          </div>

          <Link
            href="/join"
            className="mt-5 text-[0.8125rem] text-neutral-500 transition hover:text-neutral-400"
          >
            Join by PIN →
          </Link>

          {/* Feature cards */}
          <div className="mt-14 grid w-full gap-4 sm:mt-20 sm:grid-cols-3">
            {FEATURE_CARDS.map((card) => (
              <div
                key={card.title}
                className="group rounded-xl border border-white/15 bg-white/[0.04] p-6 text-left backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(255,255,255,0.03)]"
              >
                <h3 className="text-[0.9375rem] font-semibold leading-snug text-white">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-neutral-500">
                  {card.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
