import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import {
  availabilityWindows,
  bookings,
  classes,
  classTypes,
} from "@/lib/db/schema";
import { getStudioTimeZone } from "@/lib/studio-timezone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

function formatBookingClient(user: {
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
}) {
  const fullName = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();

  if (fullName) return fullName;
  return user.emailAddresses[0]?.emailAddress ?? "Unknown client";
}

export default async function AdminDashboardPage() {
  try {
    await requireAdminUserId();
  } catch {
    redirect("/dashboard");
  }

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const studioTimeZone = getStudioTimeZone();

  const [
    upcomingConfirmedRows,
    cancellationRows,
    upcomingWindowsRows,
    upcomingWindowDurationRows,
    upcomingBookingsRows,
    recentBookingsRows,
    topClassDemandRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(bookings)
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, now))),
    db
      .select({ value: count() })
      .from(bookings)
      .where(
        and(eq(bookings.status, "cancelled"), gte(bookings.createdAt, last7Days))
      ),
    db
      .select({ value: count() })
      .from(availabilityWindows)
      .where(gte(availabilityWindows.endsAt, now)),
    db
      .select({
        minutes:
          sql<number>`coalesce(sum(extract(epoch from (${availabilityWindows.endsAt} - ${availabilityWindows.startsAt})) / 60), 0)`.mapWith(
            Number
          ),
      })
      .from(availabilityWindows)
      .where(gte(availabilityWindows.endsAt, now)),
    db
      .select({
        id: bookings.id,
        classId: bookings.classId,
        userId: bookings.userId,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        classTitle: classTypes.title,
        durationMinutes: classTypes.durationMinutes,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, now))),
    db
      .select({
        id: bookings.id,
        userId: bookings.userId,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        classTitle: classTypes.title,
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
      .orderBy(desc(bookings.startsAt))
      .limit(10),
    db
      .select({
        classTypeId: classTypes.id,
        classTitle: classTypes.title,
        bookingsCount: count(bookings.id),
      })
      .from(bookings)
      .innerJoin(classes, eq(bookings.classId, classes.id))
      .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, now)))
      .groupBy(classTypes.id, classTypes.title)
      .orderBy(desc(count(bookings.id)))
      .limit(5),
  ]);

  const totalAvailableMinutes = upcomingWindowDurationRows[0]?.minutes ?? 0;
  const totalBookedMinutes = upcomingBookingsRows.reduce((sum, booking) => {
    const fallback = Math.max(
      0,
      Math.floor((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000)
    );
    return sum + (booking.durationMinutes ?? fallback);
  }, 0);
  const utilizationPercent =
    totalAvailableMinutes > 0
      ? Math.min(100, Math.round((totalBookedMinutes / totalAvailableMinutes) * 100))
      : 0;

  const uniqueUserIds = Array.from(new Set(recentBookingsRows.map((row) => row.userId)));
  let usersById = new Map<
    string,
    {
      firstName: string | null;
      lastName: string | null;
      emailAddresses: { emailAddress: string }[];
    }
  >();

  if (uniqueUserIds.length > 0) {
    try {
      const client = await clerkClient();
      const list = await client.users.getUserList({ userId: uniqueUserIds });
      usersById = new Map(
        list.data.map((user) => [
          user.id,
          {
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddresses: user.emailAddresses.map((email) => ({
              emailAddress: email.emailAddress,
            })),
          },
        ])
      );
    } catch {
      usersById = new Map();
    }
  }

  return (
    <main className="mx-auto flex min-w-0 w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:gap-6 md:py-8">
      <Card className="min-w-0">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="font-heading text-2xl font-semibold tracking-tight break-words md:text-3xl">
              Admin Dashboard
            </CardTitle>
            <CardDescription>
              Monitor bookings, cancellations, and near-term Pilates demand from one
              place.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/schedule"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Scheduling admin
            </Link>
            <Link
              href="/classes"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Open class scheduler
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardDescription>Upcoming confirmed sessions</CardDescription>
            <CardTitle className="text-2xl">{upcomingConfirmedRows[0]?.value ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Scheduled from now onward.</p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardDescription>Cancellations (last 7 days)</CardDescription>
            <CardTitle className="text-2xl">{cancellationRows[0]?.value ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Based on cancelled booking records.
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardDescription>Active availability windows</CardDescription>
            <CardTitle className="text-2xl">{upcomingWindowsRows[0]?.value ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Windows ending in the future.</p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardDescription>Utilization snapshot</CardDescription>
            <CardTitle className="text-2xl">{utilizationPercent}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Booked minutes vs available minutes.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent bookings</CardTitle>
            <CardDescription>Latest client booking activity.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {recentBookingsRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings are available yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookingsRows.map((row) => {
                    const user = usersById.get(row.userId);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[10rem] break-words md:max-w-[14rem]">
                          {user ? formatBookingClient(user) : `Client (${row.userId.slice(-6)})`}
                        </TableCell>
                        <TableCell className="break-words">{row.classTitle}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatInTimeZone(
                            row.startsAt,
                            studioTimeZone,
                            "EEE, MMM d yyyy h:mm a zzz"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.status === "confirmed" ? "default" : "secondary"}
                          >
                            {row.status === "confirmed" ? "Confirmed" : "Cancelled"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Top class demand</CardTitle>
            <CardDescription>
              Most-booked upcoming class types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topClassDemandRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming confirmed demand yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {topClassDemandRows.map((row) => (
                  <li
                    key={row.classTypeId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <span className="min-w-0 flex-1 break-words text-sm font-medium">
                      {row.classTitle}
                    </span>
                    <Badge className="shrink-0" variant="outline">
                      {row.bookingsCount}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
