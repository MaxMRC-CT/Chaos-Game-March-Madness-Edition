import Link from "next/link";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import ResultsForm from "./_components/results-form";

export default async function AdminResultsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;

  const [league, member] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, tournamentYearId: true },
    }),
    memberId
      ? prisma.leagueMember.findFirst({
          where: { id: memberId, leagueId },
          select: { isAdmin: true },
        })
      : null,
  ]);

  if (!league) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  if (!member?.isAdmin) {
    return (
      <main className="mx-auto min-h-dvh max-w-3xl space-y-4 p-6">
        <p className="text-sm text-red-600">Not authorized to manage results.</p>
        <Link href={`/league/${leagueId}/lobby`} className="underline">
          Back to lobby
        </Link>
      </main>
    );
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: league.tournamentYearId },
    select: { id: true, name: true, seed: true, region: true },
    orderBy: [{ seed: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto min-h-dvh max-w-3xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin Results</h1>
        <p className="text-sm text-neutral-600">{league.name}</p>
      </header>
      <ResultsForm leagueId={leagueId} teams={teams} />
    </main>
  );
}
