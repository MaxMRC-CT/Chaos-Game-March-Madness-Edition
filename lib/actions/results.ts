"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import {
  replaceResultsState,
  TeamResultInput,
  TournamentGameInput,
} from "@/lib/results/replace-results-state";

type ActionState = { error?: string; success?: boolean } | null;

const SAMPLE_TEAMS = [
  { name: "Kansas", seed: 1, region: "Midwest" },
  { name: "Duke", seed: 2, region: "East" },
  { name: "UConn", seed: 3, region: "South" },
  { name: "Purdue", seed: 4, region: "West" },
  { name: "Arizona", seed: 6, region: "West" },
  { name: "Miami", seed: 7, region: "Midwest" },
  { name: "Princeton", seed: 12, region: "South" },
  { name: "Yale", seed: 13, region: "East" },
];

async function requireAdmin(leagueId: string) {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value;
  if (!memberId) throw new Error("Not authorized");

  const member = await prisma.leagueMember.findFirst({
    where: { id: memberId, leagueId },
    select: { isAdmin: true },
  });
  if (!member?.isAdmin) throw new Error("Not authorized");
}

export async function importTeams(leagueId: string): Promise<ActionState> {
  try {
    await requireAdmin(leagueId);
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { tournamentYearId: true },
    });
    if (!league) return { error: "League not found" };

    for (const team of SAMPLE_TEAMS) {
      const existing = await prisma.team.findFirst({
        where: {
          tournamentYearId: league.tournamentYearId,
          name: team.name,
        },
        select: { id: true },
      });
      if (!existing) {
        await prisma.team.create({
          data: {
            tournamentYearId: league.tournamentYearId,
            name: team.name,
            seed: team.seed,
            region: team.region,
          },
        });
      }
    }

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not import teams" };
  }
}

export async function importTeamsFromForm(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = String(formData.get("leagueId") || "").trim();
  if (!leagueId) return { error: "League not found" };
  return importTeams(leagueId);
}

export async function updateResults(
  leagueId: string,
  teamResults: TeamResultInput[],
  games: TournamentGameInput[],
): Promise<ActionState> {
  try {
    await requireAdmin(leagueId);
    await replaceResultsState(leagueId, teamResults, games);
    revalidatePath(`/league/${leagueId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not update results" };
  }
}

export async function importResults(
  leagueId: string,
  teamResults: TeamResultInput[],
  games: TournamentGameInput[],
) {
  return updateResults(leagueId, teamResults, games);
}

export async function updateResultsFromForm(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamResultsRaw = String(formData.get("teamResults") || "[]");
  const gamesRaw = String(formData.get("games") || "[]");
  if (!leagueId) return { error: "League not found" };

  try {
    const teamResults = JSON.parse(teamResultsRaw) as TeamResultInput[];
    const games = JSON.parse(gamesRaw) as TournamentGameInput[];
    return updateResults(leagueId, teamResults, games);
  } catch {
    return { error: "Invalid JSON payload" };
  }
}
