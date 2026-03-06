import Image from "next/image";
import Link from "next/link";

export function BrandLockup() {
  return (
    <div className="flex flex-col items-center py-2">
      <Link
        href="./dashboard"
        className="block rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
        aria-label="Chaos Game – go to War Room"
      >
        <Image
          src="/chaos-shield.png"
          width={240}
          height={320}
          alt=""
          priority
          className="h-auto w-[140px] sm:w-[180px] lg:w-[200px]"
        />
      </Link>
    </div>
  );
}
