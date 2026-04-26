"use server";

import { toDate } from "date-fns-tz";
import { and, eq, gt, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { availabilityWindows, bookings } from "@/lib/db/schema";

const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createAvailabilityWindowSchema = z.object({
  timezone: z.string().min(1),
  date: ymdSchema,
  startTimeLocal: hhmmSchema,
  endTimeLocal: hhmmSchema,
  notes: z.string().max(2000).optional(),
});
export type CreateAvailabilityWindowInput = z.input<
  typeof createAvailabilityWindowSchema
>;

const deleteAvailabilityWindowSchema = z.object({
  windowId: z.coerce.number().int().positive(),
});
export type DeleteAvailabilityWindowInput = z.input<
  typeof deleteAvailabilityWindowSchema
>;

const cancelBookingAsAdminSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});
export type CancelBookingAsAdminInput = z.input<
  typeof cancelBookingAsAdminSchema
>;

function localToUtc(
  date: string,
  timeLocal: string,
  timezone: string
): Date {
  return toDate(`${date}T${timeLocal}:00`, { timeZone: timezone });
}

async function assertNoOverlappingWindow(
  startsAt: Date,
  endsAt: Date,
  excludeWindowId?: number
) {
  const overlaps = await db
    .select({ id: availabilityWindows.id })
    .from(availabilityWindows)
    .where(
      and(
        lt(availabilityWindows.startsAt, endsAt),
        gt(availabilityWindows.endsAt, startsAt)
      )
    )
    .limit(2);

  const conflict = overlaps.find((row) => row.id !== excludeWindowId);
  if (conflict) {
    throw new Error("This time range overlaps an existing availability window.");
  }
}

export async function createAvailabilityWindow(
  input: CreateAvailabilityWindowInput
) {
  await requireAdminUserId();
  const parsed = createAvailabilityWindowSchema.parse(input);

  const startsAt = localToUtc(parsed.date, parsed.startTimeLocal, parsed.timezone);
  const endsAt = localToUtc(parsed.date, parsed.endTimeLocal, parsed.timezone);

  if (!(endsAt > startsAt)) {
    throw new Error("End time must be after start time.");
  }

  await assertNoOverlappingWindow(startsAt, endsAt);

  await db.insert(availabilityWindows).values({
    startsAt,
    endsAt,
    notes: parsed.notes?.trim() || null,
  });

  revalidatePath("/dashboard/admin/schedule");
  revalidatePath("/scheduler", "layout");
}

export async function deleteAvailabilityWindow(
  input: DeleteAvailabilityWindowInput
) {
  await requireAdminUserId();
  const parsed = deleteAvailabilityWindowSchema.parse(input);

  await db
    .delete(availabilityWindows)
    .where(eq(availabilityWindows.id, parsed.windowId));

  revalidatePath("/dashboard/admin/schedule");
  revalidatePath("/scheduler", "layout");
}

export async function cancelBookingAsAdmin(input: CancelBookingAsAdminInput) {
  await requireAdminUserId();
  const parsed = cancelBookingAsAdminSchema.parse(input);

  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, parsed.bookingId));

  revalidatePath("/dashboard/admin/schedule");
  revalidatePath("/scheduler", "layout");
}
