import { redirect } from "next/navigation";
import { isDraftComplete } from "@/lib/league/draft-status";
import { DraftRoom } from "./_components/draft-room";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const complete = await isDraftComplete(leagueId);
  if (complete) {
    redirect(`/league/${leagueId}/dashboard`);
  }
  return <DraftRoom leagueId={leagueId} />;
}
