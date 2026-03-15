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
          : "border-white/10 bg-neutral-900/95 p-4"
      }`}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffb08d]">
          How to Play
        </p>
        <h2 className={`${isHero ? "text-xl" : "text-base"} font-semibold tracking-tight text-white`}>
          {title}
        </h2>
        <p className={`${isHero ? "text-sm" : "text-xs"} text-neutral-300`}>
          {description}
        </p>
      </div>

      <div className={`mt-4 ${isHero ? "grid gap-2 sm:grid-cols-3" : "flex flex-wrap gap-2"}`}>
        <Link
          href="/how-to-play"
          className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
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
          className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          Download Full Guide
        </Link>
        <Link
          href="/docs/chaos-league-game-card.pdf"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          Download Game Card
        </Link>
      </div>
    </section>
  );
}
