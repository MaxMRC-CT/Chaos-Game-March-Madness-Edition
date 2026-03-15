"use client";

import * as React from "react";
import { ChevronDown, Ellipsis, Flame, House, Settings, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/app/(dashboard)/_components/BrandLockup";

/** Shared aside class for league sidebar: fixed position, premium styling, no collapse */
export const LEAGUE_SIDEBAR_ASIDE_CLASS =
  "sticky top-4 hidden h-[calc(100dvh-2rem)] w-[240px] shrink-0 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-lg lg:block";

const NAV_ITEMS = [
  { href: "dashboard", segment: "dashboard", label: "Home", Icon: House, match: (pathname: string, base: string) => pathname === `${base}/dashboard` },
  { href: "standings", segment: "standings", label: "Standings", Icon: Trophy, match: (pathname: string, base: string) => pathname === `${base}/standings` },
  { href: "portfolio", segment: "portfolio", label: "My Team", Icon: Users, match: (pathname: string, base: string) => pathname === `${base}/portfolio` },
  { href: "war-room", segment: "war-room", label: "War Room", Icon: Flame, match: (pathname: string, base: string) => pathname === `${base}/war-room` },
  {
    href: "more",
    segment: "more",
    label: "More",
    Icon: Ellipsis,
    match: (pathname: string, base: string) =>
      pathname === `${base}/more` ||
      pathname === `${base}/games` ||
      pathname === `${base}/bracket` ||
      pathname.startsWith(`${base}/admin`),
  },
] as const;

type MyLeagueEntry = {
  leagueId: string;
  league: { id: string; name: string; code: string; status: string };
  member: { displayName: string };
};

function LeagueSwitcher({ currentLeagueId }: { currentLeagueId: string }) {
  const [leagues, setLeagues] = React.useState<MyLeagueEntry[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/my-leagues", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setLeagues(data.leagues ?? []))
      .catch(() => setLeagues([]));
  }, []);

  const others = leagues.filter((l) => l.leagueId !== currentLeagueId);
  const current = leagues.find((l) => l.leagueId === currentLeagueId);

  if (others.length === 0) {
    return (
      <Link
        href="/my-leagues"
        className="mt-4 block rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
      >
        My Leagues
      </Link>
    );
  }

  return (
    <div className="relative mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {current?.league.name ?? "Switch league"}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-neutral-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute left-4 right-4 z-20 mt-1 max-h-[200px] overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl"
          >
            {others.map((entry) => (
              <li key={entry.leagueId} role="option" aria-selected={false}>
                <Link
                  href={`/league/${entry.leagueId}/dashboard`}
                  className="block truncate px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {entry.league.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/my-leagues"
                className="block px-3 py-2 text-sm text-violet-400 hover:bg-neutral-800 hover:text-violet-300"
                onClick={() => setOpen(false)}
              >
                All My Leagues →
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

type LeagueSidebarNavProps = {
  leagueId: string;
  showAdmin?: boolean;
};

export function LeagueSidebarNav({ leagueId, showAdmin = false }: LeagueSidebarNavProps) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;

  return (
    <aside className={`${LEAGUE_SIDEBAR_ASIDE_CLASS} relative`} aria-label="League navigation">
      <div className="flex flex-col">
        <div className="shrink-0">
          <BrandLockup />
        </div>
        <LeagueSwitcher currentLeagueId={leagueId} />
        <nav className="mt-4 flex-1 space-y-0.5" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const to =
              "external" in item && item.external
                ? item.href
                : `${base}/${item.href}`;
            const isActive =
              !("external" in item && item.external) &&
              item.match(pathname, base);
            return (
              <NavLink
                key={item.segment}
                href={to}
                isActive={isActive}
                label={item.label}
                icon={<item.Icon className="size-[18px] shrink-0" aria-hidden />}
              />
            );
          })}
          {showAdmin ? (
            <NavLink
              href={`${base}/admin/results`}
              isActive={pathname.startsWith(`${base}/admin`)}
              label="Admin"
              icon={<Settings className="size-[18px] shrink-0" aria-hidden />}
            />
          ) : null}
        </nav>
      </div>
    </aside>
  );
}

type NavLinkProps = {
  href: string;
  isActive: boolean;
  label: string;
  icon: React.ReactNode;
};

function NavLink({ href, isActive, label, icon }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${
        isActive
          ? "bg-neutral-800/80 text-neutral-50 shadow-inner"
          : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
      }`}
    >
      {isActive ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-violet-500"
          aria-hidden
        />
      ) : null}
      <span
        className={`relative flex shrink-0 transition-transform duration-200 ${
          isActive ? "text-violet-300" : "text-neutral-400 group-hover:translate-x-0.5 group-hover:text-neutral-200"
        }`}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
