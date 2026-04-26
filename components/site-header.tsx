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
        {isAdmin ? (
          <Link
            href="/dashboard/admin"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            My Dashboard
          </Link>
        ) : null}
      </nav>
      <div className="flex items-center gap-3">
        {!userId ? <AuthDialogSection /> : null}
        {userId ? <UserButton /> : null}
      </div>
    </header>
  );
}
