import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";
import { MobileLeagueNav } from "./_components/mobile-league-nav";

export default async function LeagueLayout({
  params,
  children,
}: {
  params: Promise<{ leagueId: string }>;
  children: React.ReactNode;
}) {
  const { leagueId } = await params;

  return (
    <BrandBackground>
      <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <MobileLeagueNav leagueId={leagueId} />
    </BrandBackground>
  );
}
