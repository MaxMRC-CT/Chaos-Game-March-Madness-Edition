import { BrandBackground } from "@/app/(dashboard)/_components/BrandBackground";

export default function LeagueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandBackground>{children}</BrandBackground>;
}
