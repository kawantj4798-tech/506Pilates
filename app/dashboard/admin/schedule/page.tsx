import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { and, asc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";

import {
  createAvailabilityWindow,
  deleteAvailabilityWindow,
} from "@/app/dashboard/admin/schedule/actions";
import { requireAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import {
  availabilityWindows,
  bookings,
  classTypes,
  classes,
} from "@/lib/db/schema";
import { getStudioTimeZone } from "@/lib/studio-timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Admin Schedule",
};

function firstValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

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

export default async function AdminSchedulePage() {
  try {
    await requireAdminUserId();
  } catch {
    redirect("/dashboard");
  }

  const studioTimeZone = getStudioTimeZone();
  const now = new Date();

  const [windowRows, bookingRows] = await Promise.all([
    db
      .select({
        id: availabilityWindows.id,
        startsAt: availabilityWindows.startsAt,
        endsAt: availabilityWindows.endsAt,
        notes: availabilityWindows.notes,
      })
      .from(availabilityWindows)
      .where(gte(availabilityWindows.endsAt, now))
      .orderBy(asc(availabilityWindows.startsAt)),
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
      .where(
        and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, now))
      )
      .orderBy(asc(bookings.startsAt)),
  ]);

  const bookingCountByWindowId = new Map<number, number>();
  for (const w of windowRows) {
    let count = 0;
    for (const b of bookingRows) {
      if (b.startsAt < w.endsAt && b.endsAt > w.startsAt) count += 1;
    }
    bookingCountByWindowId.set(w.id, count);
  }

  const uniqueUserIds = Array.from(new Set(bookingRows.map((b) => b.userId)));
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
        list.data.map((u) => [
          u.id,
          {
            firstName: u.firstName,
            lastName: u.lastName,
            emailAddresses: u.emailAddresses.map((e) => ({
              emailAddress: e.emailAddress,
            })),
          },
        ])
      );
    } catch {
      usersById = new Map();
    }
  }

  async function createWindowFromForm(formData: FormData) {
    "use server";
    await createAvailabilityWindow({
      timezone: firstValue(formData.get("timezone")),
      date: firstValue(formData.get("date")),
      startTimeLocal: firstValue(formData.get("startTimeLocal")),
      endTimeLocal: firstValue(formData.get("endTimeLocal")),
      notes: firstValue(formData.get("notes")) || undefined,
    });
  }

  async function deleteWindowFromForm(formData: FormData) {
    "use server";
    await deleteAvailabilityWindow({
      windowId: firstValue(formData.get("windowId")),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-3xl">
            Admin Scheduling
          </CardTitle>
          <CardDescription>
            Publish the times you&apos;re available; the booking page slices each
            window into 1-1 slots based on the class duration. Times are
            stored in UTC and displayed in {studioTimeZone}.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add availability</CardTitle>
          <CardDescription>
            Pick a date and a start/end time. Slots inside this window become
            bookable for any active class type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createWindowFromForm}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="grid gap-2">
              <Label htmlFor="window-timezone">Timezone</Label>
              <Input
                id="window-timezone"
                name="timezone"
                defaultValue={studioTimeZone}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="window-date">Date</Label>
              <Input
                id="window-date"
                name="date"
                type="date"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="window-startTimeLocal">Start time</Label>
              <Input
                id="window-startTimeLocal"
                name="startTimeLocal"
                type="time"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="window-endTimeLocal">End time</Label>
              <Input
                id="window-endTimeLocal"
                name="endTimeLocal"
                type="time"
                required
              />
            </div>
            <div className="sm:col-span-2 grid gap-2">
              <Label htmlFor="window-notes">Notes (optional)</Label>
              <Textarea
                id="window-notes"
                name="notes"
                placeholder="Internal notes for this window"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Add window</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming availability</CardTitle>
          <CardDescription>
            Deleting a window removes its remaining slots from booking. Any
            bookings that already landed inside it stay on your calendar
            until you cancel them below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {windowRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming availability yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Bookings inside</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {windowRows.map((row) => {
                  const bookedCount =
                    bookingCountByWindowId.get(row.id) ?? 0;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        {formatInTimeZone(
                          row.startsAt,
                          studioTimeZone,
                          "EEE, MMM d yyyy"
                        )}
                      </TableCell>
                      <TableCell>
                        {formatInTimeZone(
                          row.startsAt,
                          studioTimeZone,
                          "h:mm a"
                        )}{" "}
                        –{" "}
                        {formatInTimeZone(
                          row.endsAt,
                          studioTimeZone,
                          "h:mm a zzz"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={bookedCount > 0 ? "default" : "secondary"}
                        >
                          {bookedCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {row.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <form
                          action={deleteWindowFromForm}
                          className="inline-flex"
                        >
                          <input
                            type="hidden"
                            name="windowId"
                            value={row.id}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            Delete
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming bookings</CardTitle>
          <CardDescription>Confirmed 1-1 sessions clients have booked.</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming bookings yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingRows.map((row) => {
                  const user = usersById.get(row.userId);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        {user
                          ? formatBookingClient(user)
                          : `Client (${row.userId.slice(-6)})`}
                      </TableCell>
                      <TableCell>{row.classTitle}</TableCell>
                      <TableCell>
                        {formatInTimeZone(
                          row.startsAt,
                          studioTimeZone,
                          "EEE, MMM d yyyy h:mm a"
                        )}
                      </TableCell>
                      <TableCell>
                        {formatInTimeZone(
                          row.endsAt,
                          studioTimeZone,
                          "h:mm a zzz"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
