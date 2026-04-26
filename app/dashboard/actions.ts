"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { bookings, classes } from "@/lib/db/schema";

const cancelBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});
export type CancelBookingInput = z.input<typeof cancelBookingSchema>;

const rescheduleBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});
export type RescheduleBookingInput = z.input<typeof rescheduleBookingSchema>;

export async function cancelMyBooking(input: CancelBookingInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("You must be signed in to manage bookings.");
  }

  const parsed = cancelBookingSchema.parse(input);

  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookings.id, parsed.bookingId),
        eq(bookings.userId, userId),
        eq(bookings.status, "confirmed")
      )
    );

  revalidatePath("/dashboard");
  revalidatePath("/scheduler", "layout");
}

export async function startRescheduleBooking(input: RescheduleBookingInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("You must be signed in to manage bookings.");
  }

  const parsed = rescheduleBookingSchema.parse(input);

  const row = await db
    .select({
      classId: bookings.classId,
    })
    .from(bookings)
    .innerJoin(classes, eq(bookings.classId, classes.id))
    .where(
      and(
        eq(bookings.id, parsed.bookingId),
        eq(bookings.userId, userId),
        eq(bookings.status, "confirmed"),
        eq(classes.isActive, true)
      )
    )
    .limit(1);

  if (row.length === 0) {
    throw new Error("Booking not found or unavailable for rescheduling.");
  }

  redirect(`/scheduler/${row[0].classId}`);
}
