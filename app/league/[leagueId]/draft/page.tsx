import { redirect } from "next/navigation";

/** v2: Draft removed; redirect to portfolio (roster builder). */
export default async function DraftPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  redirect(`/league/${leagueId}/portfolio`);
}
