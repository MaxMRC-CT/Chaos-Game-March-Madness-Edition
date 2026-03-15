import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeEntry } from "@/app/_components/home-entry";
import {
  getLeaguesFromCookiePairs,
  parseMemberCookies,
} from "@/lib/my-leagues/get-leagues-from-cookies";

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookiePairs = parseMemberCookies(cookieStore.getAll());

  if (cookiePairs.length > 0) {
    const savedLeagues = await getLeaguesFromCookiePairs(cookiePairs);
    if (savedLeagues.length === 1) {
      redirect(`/league/${savedLeagues[0].leagueId}/dashboard`);
    }
  }

  return <HomeEntry />;
}
