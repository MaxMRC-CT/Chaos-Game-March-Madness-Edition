"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Flame, House, Trophy, Users } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "dashboard",
    label: "Home",
    Icon: House,
    match: (pathname: string, base: string) => pathname === `${base}/dashboard`,
  },
  {
    href: "standings",
    label: "Standings",
    Icon: Trophy,
    match: (pathname: string, base: string) => pathname === `${base}/standings`,
  },
  {
    href: "portfolio",
    label: "My Team",
    Icon: Users,
    match: (pathname: string, base: string) => pathname === `${base}/portfolio`,
  },
  {
    href: "war-room",
    label: "War Room",
    Icon: Flame,
    match: (pathname: string, base: string) => pathname === `${base}/war-room`,
  },
  {
    href: "more",
    label: "More",
    Icon: Ellipsis,
    match: (pathname: string, base: string) =>
      pathname === `${base}/more` ||
      pathname === `${base}/games` ||
      pathname === `${base}/bracket` ||
      pathname.startsWith(`${base}/admin`),
  },
] as const;

export function MobileLeagueNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;

  return (
    <nav
      aria-label="Mobile league navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.04] bg-neutral-950/88 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.45rem)] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.14)] backdrop-blur-[10px] lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${base}/${item.href}`;
          const isActive = item.match(pathname, base);

          return (
            <Link
              key={item.href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                isActive
                  ? "bg-violet-500/10 text-white"
                  : "text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
              }`}
            >
              <item.Icon
                className={`size-4 ${isActive ? "text-violet-300" : "text-neutral-500"}`}
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
