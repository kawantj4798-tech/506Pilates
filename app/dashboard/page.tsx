import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq, gte } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { cancelMyBooking, startRescheduleBooking } from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { aboutContent, bookings, classes, classTypes } from "@/lib/db/schema";
import { getAvailableSlotsForClass } from "@/lib/scheduling/slots";
import { getStudioTimeZone } from "@/lib/studio-timezone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

function firstValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function formatBookingStatus(status: "confirmed" | "cancelled") {
  return status === "confirmed" ? "Confirmed" : "Cancelled";
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const isAdmin =
    user?.publicMetadata?.role === "admin" ||
    user?.privateMetadata?.role === "admin" ||
    user?.unsafeMetadata?.role === "admin";
  const studioTimeZone = getStudioTimeZone();

  if (!userId) {
    return (
      <main className="mx-auto flex min-w-0 w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>Welcome to your dashboard</CardTitle>
            <CardDescription>
              Sign in to view bookings, upcoming sessions, and available times.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link
              href="/classes"
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              Browse classes
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-w-0 w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>Unable to load account details</CardTitle>
            <CardDescription>
              Please refresh and try again to view your dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const now = new Date();
  const bookingsPromise = db
    .select({
      id: bookings.id,
      classId: bookings.classId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      classTitle: classTypes.title,
      durationMinutes: classTypes.durationMinutes,
      instructorName: classes.instructorName,
      location: classTypes.location,
    })
    .from(bookings)
    .innerJoin(classes, eq(bookings.classId, classes.id))
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.startsAt));

  const classRowsPromise = db
    .select({
      id: classes.id,
      title: classTypes.title,
      durationMinutes: classTypes.durationMinutes,
    })
    .from(classes)
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .where(eq(classes.isActive, true));

  const updatesPromise = db
    .select({
      title: aboutContent.title,
      body: aboutContent.body,
      slug: aboutContent.slug,
    })
    .from(aboutContent)
    .orderBy(desc(aboutContent.updatedAt))
    .limit(1);

  const [bookingRows, classRows, updatesRows, upcomingCountRows] = await Promise.all([
    bookingsPromise,
    classRowsPromise,
    updatesPromise,
    db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.status, "confirmed"),
          gte(bookings.endsAt, now)
        )
      ),
  ]);

  const upcomingBookings = bookingRows.filter(
    (row) => row.status === "confirmed" && row.endsAt >= now
  );
  const recentBookings = bookingRows
    .filter((row) => row.endsAt < now || row.status === "cancelled")
    .slice(0, 8);
  const nextBooking = upcomingBookings[0] ?? null;
  const confirmedBookingsTotal = bookingRows.filter(
    (row) => row.status === "confirmed"
  ).length;
  const firstName = user.firstName?.trim();
  const displayName = firstName && firstName.length > 0 ? firstName : "there";
  const userEmail = user.emailAddresses[0]?.emailAddress ?? "No email on file";

  const slotWindowEnd = addDays(now, 30);
  const slotResults = await Promise.all(
    classRows.map(async (classRow) => {
      const result = await getAvailableSlotsForClass(classRow.id, now, slotWindowEnd);
      return {
        classId: classRow.id,
        title: classRow.title,
        firstSlot: result?.slots[0] ?? null,
      };
    })
  );

  const upcomingSlotsPreview = slotResults
    .filter((row) => row.firstSlot !== null)
    .sort(
      (a, b) =>
        a.firstSlot!.startsAt.getTime() - b.firstSlot!.startsAt.getTime()
    )
    .slice(0, 5);

  const update = updatesRows[0];
  const updateSnippet = update?.body
    ? `${update.body.slice(0, 140)}${update.body.length > 140 ? "..." : ""}`
    : "No studio updates yet. Check back soon for new announcements.";

  async function cancelBookingFromForm(formData: FormData) {
    "use server";
    await cancelMyBooking({
      bookingId: firstValue(formData.get("bookingId")),
    });
  }

  async function rescheduleBookingFromForm(formData: FormData) {
    "use server";
    await startRescheduleBooking({
      bookingId: firstValue(formData.get("bookingId")),
    });
  }

  return (
    <main className="mx-auto flex min-w-0 w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:gap-6 md:py-8">
      <Card className="min-w-0">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="font-heading text-2xl font-semibold tracking-tight break-words md:text-3xl">
              Welcome back, {displayName}
            </CardTitle>
            <CardDescription>
              Track your sessions, manage bookings, and reserve your next Pilates
              class.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/classes"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Book Your Session
            </Link>
            <Link
              href={nextBooking ? `/scheduler/${nextBooking.classId}` : "/classes"}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View schedule
            </Link>
            {isAdmin ? (
              <Link
                href="/dashboard/admin/schedule"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Scheduling admin
              </Link>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming session</CardTitle>
            <CardDescription>
              Your next confirmed class and quick management actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!nextBooking ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You have no upcoming bookings yet.
                </p>
                <Link
                  href="/classes"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                >
                  Book your first session
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-base font-medium">
                    {nextBooking.classTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatInTimeZone(
                      nextBooking.startsAt,
                      studioTimeZone,
                      "EEEE, MMM d · h:mm a"
                    )}{" "}
                    -{" "}
                    {formatInTimeZone(nextBooking.endsAt, studioTimeZone, "h:mm a zzz")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nextBooking.durationMinutes} min
                    {nextBooking.instructorName
                      ? ` · ${nextBooking.instructorName}`
                      : ""}
                    {nextBooking.location ? ` · ${nextBooking.location}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={rescheduleBookingFromForm}>
                    <input type="hidden" name="bookingId" value={nextBooking.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Reschedule
                    </Button>
                  </form>
                  <form action={cancelBookingFromForm}>
                    <input type="hidden" name="bookingId" value={nextBooking.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Cancel
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Session summary</CardTitle>
            <CardDescription>
              At-a-glance view of your current booking activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              Upcoming sessions:{" "}
              <span className="text-muted-foreground">{upcomingCountRows.length}</span>
            </p>
            <p className="font-medium">
              Confirmed sessions booked:{" "}
              <span className="text-muted-foreground">{confirmedBookingsTotal}</span>
            </p>
            <p className="min-w-0 break-words font-medium">
              Account email:{" "}
              <span className="text-muted-foreground">{userEmail}</span>
            </p>
            <p className="font-medium">
              Studio timezone:{" "}
              <span className="text-muted-foreground">{studioTimeZone}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>My bookings</CardTitle>
            <CardDescription>
              Review upcoming sessions and your recent booking history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="mt-4">
                {upcomingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming bookings right now.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {upcomingBookings.slice(0, 8).map((booking) => (
                      <li
                        key={booking.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="break-words text-sm font-medium">
                            {booking.classTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatInTimeZone(
                              booking.startsAt,
                              studioTimeZone,
                              "EEE, MMM d · h:mm a zzz"
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="default">
                            {formatBookingStatus(booking.status)}
                          </Badge>
                          <Link
                            href={`/scheduler/${booking.classId}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" })
                            )}
                          >
                            View class
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="recent" className="mt-4">
                {recentBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Recent sessions will appear here after your first booking.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recentBookings.map((booking) => (
                      <li
                        key={booking.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="break-words text-sm font-medium">
                            {booking.classTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatInTimeZone(
                              booking.startsAt,
                              studioTimeZone,
                              "EEE, MMM d · h:mm a zzz"
                            )}
                          </p>
                        </div>
                        <Badge
                          className="shrink-0"
                          variant={
                            booking.status === "cancelled" ? "secondary" : "outline"
                          }
                        >
                          {formatBookingStatus(booking.status)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Studio updates</CardTitle>
            <CardDescription>Latest notes and announcements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">
              {update?.title ?? "Pilates studio announcements"}
            </p>
            <p className="text-sm text-muted-foreground">{updateSnippet}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Available time slots</CardTitle>
            <CardDescription>
              Next openings from the current studio availability windows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSlotsPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open slots are available in the next 30 days.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingSlotsPreview.map((slot) => (
                  <li
                    key={`${slot.classId}-${slot.firstSlot!.startsAt.toISOString()}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words text-sm font-medium">{slot.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInTimeZone(
                          slot.firstSlot!.startsAt,
                          studioTimeZone,
                          "EEE, MMM d · h:mm a zzz"
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/scheduler/${slot.classId}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "shrink-0"
                      )}
                    >
                      Book
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Profile & preferences</CardTitle>
            <CardDescription>
              Quick account details for scheduling consistency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              Name:{" "}
              <span className="text-muted-foreground">
                {user.fullName ?? "Not set"}
              </span>
            </p>
            <p className="min-w-0 break-words font-medium">
              Email: <span className="text-muted-foreground">{userEmail}</span>
            </p>
            <p className="font-medium">
              Preferred timezone:{" "}
              <span className="text-muted-foreground">{studioTimeZone}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Need to update profile settings? Use the account menu in the top
              right.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
