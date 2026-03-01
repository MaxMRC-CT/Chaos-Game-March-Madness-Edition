import { ReactNode } from "react";

export function BrandBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh text-[#e8ecf5]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_8%_-10%,rgba(77,216,255,0.08),transparent_60%),radial-gradient(1100px_700px_at_92%_0%,rgba(251,98,35,0.09),transparent_62%),linear-gradient(180deg,#0b1020_0%,#070a12_100%)]" />
        <div className="brand-diagonal absolute inset-0 opacity-[0.07]" />
        <div className="brand-grain absolute inset-0 opacity-[0.22]" />
        <div className="brand-vignette absolute inset-0" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
