import type { Metadata } from "next";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";

import {
  CardContent,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const isAdmin =
    user?.publicMetadata?.role === "admin" ||
    user?.privateMetadata?.role === "admin" ||
    user?.unsafeMetadata?.role === "admin";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center gap-2 text-center">
          <CardTitle className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Dashboard
          </CardTitle>
          <CardDescription className="text-base sm:text-lg">
            {isAdmin
              ? "You have admin access to class scheduling."
              : "Your Pilates hub — client tools coming soon."}
          </CardDescription>
        </CardHeader>
        {isAdmin ? (
          <CardContent className="flex justify-center">
            <Link
              href="/dashboard/admin/schedule"
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              Open Scheduling Admin
            </Link>
          </CardContent>
        ) : null}
      </Card>
    </main>
  );
}
