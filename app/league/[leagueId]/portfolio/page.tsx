import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getWarRoomData } from "@/lib/war-room/get-data";
import { MyTeam } from "../dashboard/_components/my-team";
import { WarRoomResponse } from "../dashboard/_components/types";
import { LeagueSidebarNav } from "../_components/LeagueSidebarNav";
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
    select: { id: true, championshipPrediction: true, displayName: true, isAdmin: true },
  });
  if (!member) {
    redirect(`/join?code=${encodeURIComponent(league.code)}`);
  }

  if (league.status === "LIVE" || league.status === "COMPLETE") {
    const warRoom = (await getWarRoomData(leagueId, { memberId, limit: 12 })) as WarRoomResponse | null;

    if (!warRoom) {
      return <main style={{ padding: 24 }}>League not found.</main>;
    }

    const resultByTeamId: Record<string, WarRoomResponse["teamResults"][number] | undefined> = {};
    for (const result of warRoom.teamResults) {
      resultByTeamId[result.teamId] = result;
    }

    const myStanding =
      warRoom.me ? warRoom.standings.find((row) => row.memberId === warRoom.me?.memberId) ?? null : null;

    const aliveCount = warRoom.myPicks.filter((pick) => {
      const result = resultByTeamId[pick.teamId];
      return !result || result.eliminatedRound === null || result.eliminatedRound === "CHAMP";
    }).length;

    return (
      <main className="min-h-dvh min-w-0 overflow-x-hidden text-neutral-100">
        <div className="mx-auto flex min-w-0 max-w-[1600px] gap-4 p-4">
          <LeagueSidebarNav leagueId={leagueId} showAdmin={member.isAdmin} />

          <div className="min-w-0 flex-1 space-y-4">
            <section className="rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-lg shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    My Team
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                    {member.displayName}&rsquo;s Picks
                  </h1>
                  <p className="mt-2 text-sm text-neutral-400">
                    {aliveCount} alive • {myStanding?.total ?? 0} total points
                  </p>
                </div>
                <Link
                  href={`/league/${leagueId}/games`}
                  className="text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  View Games
                </Link>
              </div>
            </section>

            <MyTeam
              myPicks={warRoom.myPicks}
              standingsRow={myStanding}
              resultByTeamId={resultByTeamId}
              ownershipByRole={warRoom.ownershipByRole}
            />
          </div>
        </div>
      </main>
    );
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
            <h1 className="text-2xl font-semibold tracking-tight">My Team</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Build your roster: 2 Heroes, 2 Villains, 2 Cinderellas (seed 10+), plus championship tiebreaker
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/league/${leagueId}/dashboard`}
              prefetch={false}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Home
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
          initialChampionshipPrediction={member.championshipPrediction ?? undefined}
        />
      </div>
    </main>
  );
}
