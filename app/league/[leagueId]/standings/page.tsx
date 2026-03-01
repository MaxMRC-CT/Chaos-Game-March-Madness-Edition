import StandingsClient from "./_components/standings-client";

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  return <StandingsClient leagueId={leagueId} />;
}
