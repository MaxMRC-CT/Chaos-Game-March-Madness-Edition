"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, LayoutGrid, Shield, Users } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "standings",
    label: "League",
    Icon: Flame,
    match: (pathname: string, base: string) => pathname === `${base}/standings`,
  },
  {
    href: "dashboard",
    label: "War Room",
    Icon: Shield,
    match: (pathname: string, base: string) => pathname === `${base}/dashboard`,
  },
  {
    href: "portfolio",
    label: "Roster",
    Icon: Users,
    match: (pathname: string, base: string) => pathname === `${base}/portfolio`,
  },
  {
    href: "bracket",
    label: "Bracket",
    Icon: LayoutGrid,
    match: (pathname: string, base: string) => pathname === `${base}/bracket`,
  },
] as const;

export function MobileLeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;

  return (
    <nav
      aria-label="Mobile league navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${base}/${item.href}`;
          const isActive = item.match(pathname, base);

          return (
            <Link
              key={item.href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                isActive
                  ? "bg-violet-500/12 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <item.Icon
                className={`size-5 ${isActive ? "text-violet-300" : "text-neutral-500"}`}
                aria-hidden
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
