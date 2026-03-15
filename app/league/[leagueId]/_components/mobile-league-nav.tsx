"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis, Flame, House, Trophy, Users } from "lucide-react";
import { getSavedLeagues } from "@/lib/client/device-session";

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
  const [showSwitchLeague, setShowSwitchLeague] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setShowSwitchLeague(getSavedLeagues().length > 1);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <nav
      aria-label="Mobile league navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.05] bg-neutral-950/88 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.18)] backdrop-blur-sm lg:hidden"
    >
      {showSwitchLeague ? (
        <div className="mx-auto mb-1 max-w-lg">
          <Link
            href="/my-leagues"
            className="flex min-h-8.5 items-center justify-center rounded-xl border border-white/[0.06] bg-neutral-900/65 px-3 text-[11px] font-medium text-neutral-200 transition hover:bg-neutral-800"
          >
            Switch League
          </Link>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${base}/${item.href}`;
          const isActive = item.match(pathname, base);

          return (
            <Link
              key={item.href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[3.35rem] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium transition ${
                isActive
                  ? "bg-violet-500/9 text-white"
                  : "text-neutral-400 hover:bg-neutral-900/70 hover:text-neutral-200"
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
