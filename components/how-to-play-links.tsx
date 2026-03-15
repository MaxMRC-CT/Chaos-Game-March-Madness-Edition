import Link from "next/link";

type Variant = "hero" | "compact";

export function HowToPlayLinks({
  variant = "hero",
  title = "Need a refresher?",
  description = "Learn how Heroes, Villains, and Cinderellas work and where to go in the app.",
}: {
  variant?: Variant;
  title?: string;
  description?: string;
}) {
  const isHero = variant === "hero";

  return (
    <section
      className={`rounded-2xl border shadow-lg shadow-black/20 ${
        isHero
          ? "border-[#fb6223]/25 bg-gradient-to-br from-[#1a2236] to-[#101827] p-5"
          : "border-white/10 bg-neutral-900/95 p-3.5"
      }`}
    >
      <div className={`${isHero ? "space-y-2" : "space-y-1.5"}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffb08d]">
          How to Play
        </p>
        <h2 className={`${isHero ? "text-xl" : "text-[15px]"} font-semibold tracking-tight text-white`}>
          {title}
        </h2>
        <p className={`${isHero ? "text-sm" : "text-[11px]"} text-neutral-300`}>
          {description}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Link
          href="/how-to-play"
          className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm transition ${
            isHero
              ? "bg-[#fb6223] text-white hover:bg-[#e35a20]"
              : "border border-neutral-700 bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
          }`}
        >
          View How to Play
        </Link>
        <Link
          href="/docs/chaos-league-how-to-play.pdf"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          Download Full Guide
        </Link>
        <Link
          href="/docs/chaos-league-game-card.pdf"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          Download Game Card
        </Link>
      </div>
    </section>
  );
}
