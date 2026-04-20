import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** `public/logo-header.png` — wide mark for the nav bar. */
const HEADER_LOGO = { src: "/logo-header.png" as const, width: 1536, height: 1024 };
/** `public/logo.png` — square mark for the home hero. */
const HERO_LOGO = { src: "/logo.png" as const, width: 1024, height: 1024 };

type SiteLogoProps = {
  variant?: "header" | "hero";
  className?: string;
};

export function SiteLogo({ variant = "header", className }: SiteLogoProps) {
  const asset = variant === "header" ? HEADER_LOGO : HERO_LOGO;

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variant === "header" && "-my-1 -ml-1 max-w-[min(100%,11rem)] p-1",
        variant === "hero" && "mx-auto p-1",
        className
      )}
      aria-label="506 Pilates Lab home"
    >
      <Image
        src={asset.src}
        alt=""
        width={asset.width}
        height={asset.height}
        className={cn(
          "object-contain",
          variant === "header" && "h-9 w-auto object-left",
          variant === "hero" && "h-32 w-32 sm:h-40 sm:w-40"
        )}
        priority={variant === "hero"}
      />
    </Link>
  );
}
