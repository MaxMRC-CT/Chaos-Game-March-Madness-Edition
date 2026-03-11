import { PrelaunchLanding } from "@/app/_components/prelaunch-landing";
import { HomePage } from "@/app/_components/home-page";

export default function Page() {
  if (process.env.PRELAUNCH_MODE === "true") {
    return <PrelaunchLanding />;
  }
  return <HomePage />;
}
