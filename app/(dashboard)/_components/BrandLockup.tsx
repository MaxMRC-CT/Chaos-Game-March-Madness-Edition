import Image from "next/image";
import Link from "next/link";

export function BrandLockup() {
  return (
    <div className="flex flex-col items-center pt-4 pb-4">
      <Link href="./dashboard" className="block">
        <Image
          src="/chaos-shield.png"
          width={240}
          height={320}
          alt="Chaos Game"
          priority
          className="w-[180px] h-[240px] sm:w-[220px] sm:h-[300px] lg:w-[240px] lg:h-[320px]"
        />
      </Link>
    </div>
  );
}
