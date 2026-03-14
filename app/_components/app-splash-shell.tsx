"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_VISIBLE_MS = 1100;
const SPLASH_FADE_MS = 280;

export function AppSplashShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
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
          className={`fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-[#0b0f19] transition-opacity duration-300 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(77,216,255,0.12),transparent_28%),radial-gradient(circle_at_50%_44%,rgba(251,98,35,0.14),transparent_34%),linear-gradient(180deg,#0b0f19_0%,#070a12_100%)]" />
            <div className="brand-grain absolute inset-0 opacity-[0.18]" />
            <div className="brand-vignette absolute inset-0" />
          </div>

          <div className="relative flex flex-col items-center px-6 text-center">
            <div className="absolute inset-x-0 top-1/2 -z-10 h-36 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,98,35,0.24)_0%,rgba(77,216,255,0.16)_38%,transparent_72%)] blur-3xl" />
            <div className="relative">
              <Image
                src="/chaos-shield.png"
                width={168}
                height={168}
                alt="Chaos League"
                priority
                className="h-28 w-28 animate-[splash-logo-float_1.8s_ease-in-out_infinite] object-contain drop-shadow-[0_0_28px_rgba(251,98,35,0.28)] sm:h-32 sm:w-32"
              />
            </div>
            <div className="mt-5 space-y-2">
              <p className="text-2xl font-semibold tracking-tight text-[#f4f7fb] sm:text-3xl">
                Chaos League
              </p>
              <p className="text-xs uppercase tracking-[0.28em] text-[#9aa6bf] sm:text-sm">
                March Madness Edition
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4dd8ff] animate-[splash-pulse_1.1s_ease-in-out_infinite]" />
              <span className="h-2 w-2 rounded-full bg-[#fb6223] animate-[splash-pulse_1.1s_ease-in-out_0.18s_infinite]" />
              <span className="h-2 w-2 rounded-full bg-white/70 animate-[splash-pulse_1.1s_ease-in-out_0.36s_infinite]" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
