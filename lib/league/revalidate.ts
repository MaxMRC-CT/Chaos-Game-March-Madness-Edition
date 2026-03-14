import { revalidatePath } from "next/cache";

export function revalidateLeagueViews(leagueId: string) {
  const paths = [
    `/league/${leagueId}/dashboard`,
    `/league/${leagueId}/standings`,
    `/league/${leagueId}/bracket`,
    `/league/${leagueId}/portfolio`,
    `/league/${leagueId}/lobby`,
    `/league/${leagueId}/admin/results`,
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}
