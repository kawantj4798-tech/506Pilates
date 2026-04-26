import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { AuthDialogSection } from "@/components/auth-dialog-section";
import { SiteLogo } from "@/components/site-logo";
import { buttonVariants } from "@/components/ui/button";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const { userId } = await auth();
  const isAdmin = userId ? await isCurrentUserAdmin() : false;

  return (
    <header className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/40 p-3 md:p-4">
      <nav
        className="flex min-w-0 flex-wrap items-center gap-1"
        aria-label="Main navigation"
      >
        <SiteLogo variant="header" />
        <Link
          href="/classes"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Book Your Session
        </Link>
        {isAdmin ? (
          <Link
            href="/dashboard/admin"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            My Dashboard
          </Link>
        ) : null}
      </nav>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {!userId ? <AuthDialogSection /> : null}
        {userId ? <UserButton /> : null}
      </div>
    </header>
  );
}
