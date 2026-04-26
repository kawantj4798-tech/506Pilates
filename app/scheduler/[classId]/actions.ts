"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, gt, lt, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  availabilityWindows,
  bookings,
  classTypes,
  classes,
} from "@/lib/db/schema";

const createBookingSchema = z.object({
  classId: z.coerce.number().int().positive(),
  startsAtIso: z
    .string()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid start time"),
});
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export async function createBooking(
  input: CreateBookingInput
): Promise<{ bookingId: number }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("You must be signed in to book a session.");
  }

  const parsed = createBookingSchema.parse(input);
  const startsAt = new Date(parsed.startsAtIso);

  const classRow = await db
    .select({
      id: classes.id,
      durationMinutes: classTypes.durationMinutes,
    })
    .from(classes)
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .where(and(eq(classes.id, parsed.classId), eq(classes.isActive, true)))
    .limit(1);

  if (classRow.length === 0) {
    throw new Error("Class not found or not bookable.");
  }

  const endsAt = new Date(
    startsAt.getTime() + classRow[0].durationMinutes * 60 * 1000
  );

  const containingWindow = await db
    .select({ id: availabilityWindows.id })
    .from(availabilityWindows)
    .where(
      and(
        lte(availabilityWindows.startsAt, startsAt),
        gte(availabilityWindows.endsAt, endsAt)
      )
    )
    .limit(1);

  if (containingWindow.length === 0) {
    throw new Error("That slot is no longer available.");
  }

  const conflicting = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        lt(bookings.startsAt, endsAt),
        gt(bookings.endsAt, startsAt)
      )
    )
    .limit(1);

  if (conflicting.length > 0) {
    throw new Error("That slot was just booked. Please choose another time.");
  }

  const [inserted] = await db
    .insert(bookings)
    .values({
      classId: parsed.classId,
      userId,
      startsAt,
      endsAt,
      status: "confirmed",
    })
    .returning({ id: bookings.id });

  revalidatePath(`/scheduler/${parsed.classId}`);
  revalidatePath("/dashboard/admin/schedule");

  return { bookingId: inserted.id };
}
