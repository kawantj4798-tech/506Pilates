import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

import { AuthDialogSection } from "@/components/auth-dialog-section";
import { SiteLogo } from "@/components/site-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 p-4">
      <nav
        className="flex flex-wrap items-center gap-1"
        aria-label="Main navigation"
      >
        <SiteLogo variant="header" />
        <Link
          href="/classes"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Book Class
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <AuthDialogSection />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
