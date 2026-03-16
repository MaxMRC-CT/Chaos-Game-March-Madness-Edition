import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Crown, Radio, Users } from "lucide-react";
import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";
import { prisma } from "@/lib/db";
import { PinCard } from "./components/pin-card";
import { LobbyMemberList } from "./components/lobby-member-list";
import { ShareLeagueButton } from "./components/share-league-button";
import { StartTournamentForm } from "./components/start-tournament-form";

function getStatusMeta(status: string, memberCount: number) {
  if (status === "SETUP") {
    return {
      label: memberCount > 1 ? "Ready for draft" : "Waiting for players",
      tone: "border-[#fb6223]/25 bg-[#fb6223]/10 text-[#ffcfb8]",
    };
  }

  if (status === "LOCKED") {
    return {
      label: "Ready for tip-off",
      tone: "border-violet-500/25 bg-violet-500/10 text-violet-200",
    };
  }

  if (status === "DRAFT") {
    return {
      label: "Draft in progress",
      tone: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    };
  }

  if (status === "LIVE") {
    return {
      label: "Live",
      tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    };
  }

  return {
    label: "Complete",
    tone: "border-white/15 bg-white/[0.06] text-neutral-200",
  };
}

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
  const statusMeta = getStatusMeta(league.status, members.length);

  return (
    <BrandBackground>
      <main className="app-shell app-safe-top app-safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-6 text-neutral-100 sm:px-6">
        <header className="rounded-3xl border border-white/10 bg-neutral-950/88 p-5 shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb08d]">
                Chaos League
              </p>
              <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-white">
                {league.name}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                {currentMember
                  ? `You're in as ${currentMember.displayName}${isCurrentMemberAdmin ? ", league manager." : "."}`
                  : "Join the board, share the PIN, and get everyone ready for tip-off."}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2 text-neutral-400">
                <Users className="size-4" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Players
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">{members.length}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {members.length === 1 ? "Waiting for more players" : "Board filling up"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2 text-neutral-400">
                {isCurrentMemberAdmin ? (
                  <Crown className="size-4" />
                ) : (
                  <Radio className="size-4" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Your Role
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-white">
                {isCurrentMemberAdmin ? "League Manager" : "Player"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {isCurrentMemberAdmin
                  ? "You control the start of the tournament."
                  : "Finish your roster and watch the room fill in."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                League PIN
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-white">
                {league.code ?? "—"}
              </p>
            </div>
            <ShareLeagueButton leaguePin={league.code ?? null} />
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Link
              href={`/league/${leagueId}/portfolio`}
              className="inline-flex min-h-12 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              Build roster
              <ArrowRight className="size-4 text-neutral-400" />
            </Link>
            <Link
              href={`/league/${leagueId}/standings`}
              className="inline-flex min-h-12 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              View standings
              <ArrowRight className="size-4 text-neutral-400" />
            </Link>
            {isCurrentMemberAdmin ? (
              <Link
                href={`/league/${leagueId}/admin/results`}
                className="inline-flex min-h-12 items-center justify-between rounded-2xl border border-[#fb6223]/20 bg-[#fb6223]/10 px-4 py-3 text-sm font-medium text-[#ffd0bb] transition hover:bg-[#fb6223]/14 sm:col-span-2"
              >
                Open admin results
                <ArrowRight className="size-4 text-[#ffb08d]" />
              </Link>
            ) : null}
          </div>
        </header>

        <PinCard pin={league.code ?? null} leagueName={league.name} />

        <LobbyMemberList
          leagueId={leagueId}
          currentMemberId={currentMemberId}
          initialMembers={members.map((member) => ({
            id: member.id,
            displayName: member.displayName,
            isAdmin: member.isAdmin,
          }))}
        />

        {(league.status === "SETUP" || league.status === "LOCKED") && isCurrentMemberAdmin ? (
          <section className="rounded-2xl border border-white/10 bg-neutral-950/88 p-4 shadow-lg shadow-black/20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              League Controls
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Start the tournament</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Lock the room in once everyone is ready and the board is set.
            </p>
            <div className="mt-4">
              <StartTournamentForm leagueId={leagueId} />
            </div>
          </section>
        ) : null}
      </main>
    </BrandBackground>
  );
}
