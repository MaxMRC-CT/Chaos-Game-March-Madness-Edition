import { prisma } from "@/lib/db";
import { makePick } from "@/lib/actions/draft";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PinCard } from "./components/pin-card";
import { LobbyMemberList } from "./components/lobby-member-list";
import { StartDraftForm } from "./components/start-draft-form";

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

  const [members, pickedTeams, availableTeams, pickHistory] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { leagueId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      select: { teamId: true },
    }),
    prisma.team.findMany({
      where: { tournamentYearId: league.tournamentYearId },
      orderBy: [{ seed: "asc" }, { name: "asc" }],
      select: { id: true, name: true, seed: true, region: true },
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      include: {
        member: { select: { displayName: true } },
        team: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const draftOrder = [...members]
    .filter((member) => member.draftPosition !== null)
    .sort((a, b) => (a.draftPosition ?? 0) - (b.draftPosition ?? 0));

  const currentMember = members.find((member) => member.id === currentMemberId) ?? null;
  const isCurrentMemberAdmin = Boolean(currentMember?.isAdmin);
  const currentDraftPosition =
    league.status === "DRAFT" ? league.currentPick : null;
  const currentDrafter =
    league.status === "DRAFT"
      ? draftOrder.find((member) => member.draftPosition === currentDraftPosition)
      : null;
  const canPick = Boolean(currentDrafter && currentDrafter.id === currentMemberId);
  const pickedTeamIds = new Set(pickedTeams.map((pick) => pick.teamId));
  const unpickedTeams = availableTeams.filter((team) => !pickedTeamIds.has(team.id));

  async function makePickForLeague(formData: FormData) {
    "use server";
    const teamId = String(formData.get("teamId") || "").trim();
    await makePick(leagueId, teamId);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{league.name}</h1>
        <div className="flex gap-3 text-sm">
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
        <StartDraftForm leagueId={leagueId} />
      ) : null}

      {league.status === "DRAFT" && canPick ? (
        <section className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-700">Make Pick</h2>
          {unpickedTeams.length === 0 ? (
            <p className="text-sm text-neutral-600">No teams remaining.</p>
          ) : (
            <form action={makePickForLeague} className="space-y-3">
              <select
                name="teamId"
                required
                defaultValue=""
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select a team
                </option>
                {unpickedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    ({team.seed}) {team.name} - {team.region}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Make Pick
              </button>
            </form>
          )}
        </section>
      ) : null}

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Draft Order</h2>
        {draftOrder.length === 0 ? (
          <p className="text-sm text-neutral-600">Draft order will appear after start.</p>
        ) : (
          <ol className="space-y-2">
            {draftOrder.map((member) => {
              const isCurrentDrafter =
                league.status === "DRAFT" &&
                member.draftPosition === currentDraftPosition;

              return (
                <li
                  key={member.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isCurrentDrafter ? "border-black bg-neutral-100" : ""
                  }`}
                >
                  <span>{member.displayName}</span>
                  <span className="flex items-center gap-2 text-sm text-neutral-600">
                    {isCurrentDrafter ? (
                      <span className="rounded-full bg-black px-2 py-1 text-xs text-white">
                        On the clock
                      </span>
                    ) : null}
                    <span>#{member.draftPosition}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Pick History</h2>
        {pickHistory.length === 0 ? (
          <p className="text-sm text-neutral-600">No picks yet.</p>
        ) : (
          <ul className="space-y-2">
            {pickHistory.map((pick) => (
              <li
                key={pick.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{pick.member.displayName}</span>
                <span className="text-neutral-600">{pick.team.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
