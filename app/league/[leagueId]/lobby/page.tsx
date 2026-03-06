import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PinCard } from "./components/pin-card";
import { LobbyMemberList } from "./components/lobby-member-list";
import { StartTournamentForm } from "./components/start-tournament-form";

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });

  if (!league) {
    return <main style={{ padding: 24 }}>League not found.</main>;
  }

  if (league.status === "LIVE" || league.status === "COMPLETE") {
    redirect(`/league/${leagueId}/dashboard`);
  }

  const cookieStore = await cookies();
  const currentMemberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    orderBy: { createdAt: "asc" },
  });

  const currentMember = members.find((member) => member.id === currentMemberId) ?? null;
  const isCurrentMemberAdmin = Boolean(currentMember?.isAdmin);

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/league/${leagueId}/portfolio`} className="underline">
            Build roster
          </Link>
          <Link href={`/league/${leagueId}/standings`} className="underline">
            Standings
          </Link>
          {isCurrentMemberAdmin ? (
            <Link href={`/league/${leagueId}/admin/results`} className="underline">
              Admin Results
            </Link>
          ) : null}
        </div>
      </header>

      <PinCard pin={league.code ?? null} />

      <LobbyMemberList
        leagueId={leagueId}
        initialMembers={members.map((member) => ({
          id: member.id,
          displayName: member.displayName,
          isAdmin: member.isAdmin,
        }))}
      />

      {league.status === "SETUP" && isCurrentMemberAdmin ? (
        <StartTournamentForm leagueId={leagueId} />
      ) : null}
    </main>
  );
}
