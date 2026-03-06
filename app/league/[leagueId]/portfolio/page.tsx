import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PortfolioBuilder } from "./_components/portfolio-builder";

const REGION_ORDER = ["East", "West", "South", "Midwest"];

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, code: true, status: true, tournamentYearId: true },
  });

  if (!league) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-neutral-400">League not found.</p>
      </main>
    );
  }

  if (!memberId) {
    redirect(`/join?code=${encodeURIComponent(league.code)}`);
  }

  const member = await prisma.leagueMember.findFirst({
    where: { leagueId, id: memberId },
    select: { id: true },
  });
  if (!member) {
    redirect(`/join?code=${encodeURIComponent(league.code)}`);
  }

  const [teams, myPicks, memberCount] = await Promise.all([
    prisma.team.findMany({
      where: { tournamentYearId: league.tournamentYearId },
      select: { id: true, name: true, shortName: true, seed: true, region: true },
      orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
    }),
    prisma.portfolioPick.findMany({
      where: { leagueId, memberId },
      select: { teamId: true, role: true },
    }),
    prisma.leagueMember.count({ where: { leagueId } }),
  ]);

  const regions = REGION_ORDER.map((region) => ({
    region,
    teams: teams.filter((t) => t.region === region),
  })).filter((r) => r.teams.length > 0);

  const picksByTeamId: Record<string, "HERO" | "VILLAIN" | "CINDERELLA"> = {};
  for (const p of myPicks) picksByTeamId[p.teamId] = p.role;
  const ownershipPct = memberCount > 0 ? Math.round(100 / memberCount) : 0;

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{league.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Build your roster: 2 Heroes, 2 Villains, 2 Cinderellas (seed 10+)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/league/${leagueId}/dashboard`}
              prefetch={false}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Dashboard
            </Link>
            <Link
              href={`/league/${leagueId}/standings`}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Standings
            </Link>
          </div>
        </header>

        <PortfolioBuilder
          leagueId={leagueId}
          leagueStatus={league.status}
          regions={regions}
          initialPicks={myPicks.map((p) => ({ teamId: p.teamId, role: p.role }))}
          picksByTeamId={picksByTeamId}
          ownershipPct={ownershipPct}
        />
      </div>
    </main>
  );
}
