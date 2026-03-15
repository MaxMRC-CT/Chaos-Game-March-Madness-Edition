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
        <div className="relative aspect-[2/3] w-[140px] sm:w-[180px] lg:w-[200px]">
          <Image
            src="/chaos-shield.png"
            fill
            alt=""
            sizes="(min-width: 1024px) 200px, (min-width: 640px) 180px, 140px"
            className="object-contain"
          />
        </div>
      </Link>
    </div>
  );
}
