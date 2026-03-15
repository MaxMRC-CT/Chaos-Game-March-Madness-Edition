"use client";

import { useRouter } from "next/navigation";

export function HowToPlayBackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-neutral-950/70 px-4 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-neutral-900"
    >
      Back
    </button>
  );
}
