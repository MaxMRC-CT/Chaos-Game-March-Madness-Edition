import { DraftRoom } from "./_components/draft-room";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  return <DraftRoom leagueId={leagueId} />;
}
