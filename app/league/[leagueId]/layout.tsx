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
      <div className="app-safe-top app-nav-clear lg:px-0 lg:pt-4 lg:pb-0">
        {children}
      </div>
      <MobileLeagueNav leagueId={leagueId} />
    </BrandBackground>
  );
}
