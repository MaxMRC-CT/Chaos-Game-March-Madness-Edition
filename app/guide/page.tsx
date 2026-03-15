import Link from "next/link";
import Image from "next/image";
import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";
import { guideContent } from "@/lib/content/guide-content";
import type { GuideSection } from "@/lib/content/guide-content";

export default function GuidePage() {
  const { sections } = guideContent;

  return (
    <BrandBackground>
      <main className="app-shell app-safe-top app-safe-bottom min-w-0 overflow-x-hidden text-neutral-100">
        <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 lg:flex-row lg:gap-12">
          {/* Sticky nav: top on mobile, right on desktop */}
          <nav
            aria-label="Guide sections"
            className="order-2 shrink-0 lg:order-1 lg:w-[200px] lg:pt-20"
          >
              <div className="sticky top-4 flex flex-row gap-2 overflow-x-auto pb-2 lg:top-6 lg:flex-col lg:overflow-visible lg:pb-0">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="whitespace-nowrap rounded-lg border border-neutral-700/60 bg-neutral-800/40 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white lg:border-0 lg:bg-transparent lg:py-1.5"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            <header className="mb-6 flex items-center gap-4">
              <Link
                href="/"
                className="rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                <div className="relative aspect-[2/3] w-[60px] sm:w-[80px]">
                  <Image
                    src="/chaos-shield.png"
                    alt="Chaos League"
                    fill
                    sizes="(min-width: 640px) 80px, 60px"
                    className="object-contain"
                  />
                </div>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  League Guide
                </h1>
                <p className="text-sm text-neutral-400">
                  How to play Chaos League
                </p>
              </div>
            </header>

            <div className="space-y-6">
              {sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>

            <footer className="mt-12 flex flex-wrap gap-4 border-t border-neutral-800 pt-8 text-sm">
              <Link href="/create" className="text-neutral-400 hover:text-white">
                Create League
              </Link>
              <Link href="/join" className="text-neutral-400 hover:text-white">
                Join with Game PIN
              </Link>
              <Link href="/my-leagues" className="text-neutral-400 hover:text-white">
                My Leagues
              </Link>
            </footer>
          </div>
        </div>
      </main>
    </BrandBackground>
  );
}

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-xl border border-neutral-800 bg-neutral-900/95 p-6"
    >
      <h2 className="mb-4 text-lg font-semibold text-white">{section.title}</h2>

      {section.type === "paragraphs" && section.content && (
        <div className="space-y-3">
          {section.content.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-neutral-300">
              {para}
            </p>
          ))}
        </div>
      )}

      {section.type === "roles" && section.roles && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.roles.map((role) => (
            <div
              key={role.id}
              className="rounded-lg border border-neutral-700/80 bg-neutral-800/50 p-4"
            >
              <h3 className="font-medium text-white">{role.name}</h3>
              <p className="mt-1 text-xs text-neutral-400">{role.tagline}</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                {role.description}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                {role.count} per portfolio
              </p>
            </div>
          ))}
        </div>
      )}

      {section.type === "scoring" && (
        <div className="space-y-4">
          {section.content?.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-neutral-300">
              {para}
            </p>
          ))}
          {section.tableRows && section.tableRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-neutral-700">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-800/80">
                    <th className="px-3 py-2.5 font-medium text-neutral-200">
                      Round / Outcome
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-200">
                      Hero
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-200">
                      Villain
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-200">
                      Cinderella
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.tableRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-800 last:border-0"
                    >
                      <td className="px-3 py-2 text-neutral-300">{row.round}</td>
                      <td className="px-3 py-2 text-neutral-300">{row.hero}</td>
                      <td className="px-3 py-2 text-neutral-300">
                        {row.villain}
                      </td>
                      <td className="px-3 py-2 text-neutral-300">
                        {row.cinderella}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section.type === "lifecycle" && section.content && (
        <div className="space-y-3">
          {section.content.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-neutral-300">
              {para}
            </p>
          ))}
        </div>
      )}

      {section.type === "bullets" && section.bullets && (
        <ul className="list-inside list-disc space-y-2 text-sm text-neutral-300">
          {section.bullets.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.type === "faq" && section.faq && (
        <dl className="space-y-4">
          {section.faq.map((item, i) => (
            <div key={i}>
              <dt className="font-medium text-neutral-200">{item.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-neutral-400">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
