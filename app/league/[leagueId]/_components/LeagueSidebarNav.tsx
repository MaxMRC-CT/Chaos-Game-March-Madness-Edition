"use client";

import { Flame, LayoutGrid, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/app/(dashboard)/_components/BrandLockup";

/** Shared aside class for league sidebar: fixed position, premium styling, no collapse */
export const LEAGUE_SIDEBAR_ASIDE_CLASS =
  "sticky top-4 hidden h-[calc(100dvh-2rem)] w-[240px] shrink-0 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-lg lg:block";

const NAV_ITEMS = [
  { href: "dashboard", segment: "dashboard", label: "War Room", Icon: Shield },
  { href: "bracket", segment: "bracket", label: "Full Bracket", Icon: LayoutGrid },
  { href: "standings", segment: "standings", label: "My League", Icon: Flame },
] as const;

type LeagueSidebarNavProps = {
  leagueId: string;
  showAdmin?: boolean;
};

export function LeagueSidebarNav({ leagueId, showAdmin = false }: LeagueSidebarNavProps) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;

  return (
    <aside className={LEAGUE_SIDEBAR_ASIDE_CLASS} aria-label="League navigation">
      <div className="flex flex-col">
        <div className="shrink-0">
          <BrandLockup />
        </div>
        <nav className="mt-4 flex-1 space-y-0.5" aria-label="Main">
          {NAV_ITEMS.map(({ href, segment, label, Icon }) => {
            const to = `${base}/${href}`;
            const isActive =
              pathname === to ||
              (pathname.startsWith(to + "/") && segment !== "dashboard");
            return (
              <NavLink
                key={segment}
                href={to}
                isActive={isActive}
                label={label}
                icon={<Icon className="size-[18px] shrink-0" aria-hidden />}
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
