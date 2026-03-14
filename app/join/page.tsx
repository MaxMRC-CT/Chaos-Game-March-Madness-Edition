import { Suspense } from "react";
import JoinLeague from "@/components/join-league";

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <JoinLeague />
    </Suspense>
  );
}
