"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_VISIBLE_MS = 520;
const SPLASH_FADE_MS = 180;

function isAuditMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("audit") === "1" || window.navigator.webdriver === true;
}

export function AppSplashShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (isAuditMode()) {
      setIsFading(false);
      setIsVisible(false);
      return;
    }

    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, SPLASH_VISIBLE_MS);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, SPLASH_VISIBLE_MS + SPLASH_FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      <div
        className={`transition-opacity duration-300 ${
          isVisible ? "opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </div>

      {isVisible ? (
        <div
          aria-hidden
          className={`fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0b0f19] transition-opacity duration-200 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(77,216,255,0.08),transparent_24%),radial-gradient(circle_at_50%_44%,rgba(251,98,35,0.1),transparent_30%),linear-gradient(180deg,#0b0f19_0%,#070a12_100%)]" />
            <div className="brand-grain absolute inset-0 opacity-[0.12]" />
            <div className="brand-vignette absolute inset-0" />
          </div>

          <div className="relative flex flex-col items-center px-6 text-center">
            <div className="absolute inset-x-0 top-1/2 -z-10 h-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,98,35,0.16)_0%,rgba(77,216,255,0.1)_38%,transparent_72%)] blur-3xl" />
            <div className="relative h-20 w-20 sm:h-24 sm:w-24">
              <Image
                src="/chaos-shield.png"
                fill
                alt="Chaos League"
                priority
                sizes="(min-width: 640px) 6rem, 5rem"
                className="animate-[splash-logo-float_1.4s_ease-in-out_infinite] object-contain drop-shadow-[0_0_20px_rgba(251,98,35,0.22)]"
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <p className="text-xl font-semibold tracking-tight text-[#f4f7fb] sm:text-2xl">
                Chaos League
              </p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#9aa6bf] sm:text-xs">
                March Madness Edition
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4dd8ff] animate-[splash-pulse_1s_ease-in-out_infinite]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#fb6223] animate-[splash-pulse_1s_ease-in-out_0.18s_infinite]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-[splash-pulse_1s_ease-in-out_0.36s_infinite]" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
