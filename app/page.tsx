import { Suspense } from "react";
import JoinLeague from "@/components/join-league";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#0c1424] to-[#0e1a2f] text-white">Loading...</div>}>
      <JoinLeague />
    </Suspense>
  );
}
