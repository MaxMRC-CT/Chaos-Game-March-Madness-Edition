import Image from "next/image";

export function LeagueHeader() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-center rounded-xl border border-[#1f2937] bg-[#111827]/80 px-4 py-2 backdrop-blur-sm">
        <div className="relative mr-3 h-12 w-12 flex-shrink-0 sm:h-14 sm:w-14 md:h-16 md:w-16">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(77,216,255,0.22)_0%,rgba(251,98,35,0.12)_45%,transparent_72%)] blur-md" />
          <Image
            src="/chaos-shield.png"
            fill
            alt="Chaos Game"
            sizes="(min-width: 768px) 4rem, (min-width: 640px) 3.5rem, 3rem"
            className="rounded-md object-contain"
          />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8ecf5] md:text-3xl">
            Chaos Game
          </h1>
          <p className="text-xs uppercase tracking-[0.14em] text-[#aab4c8] md:text-sm">
            March Madness Edition
          </p>
        </div>
      </div>
    </div>
  );
}
