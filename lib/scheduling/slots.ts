import { and, eq, gte, lt, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  availabilityWindows,
  bookings,
  classTypes,
  classes,
} from "@/lib/db/schema";

export type Slot = {
  startsAt: Date;
  endsAt: Date;
};

type Window = {
  startsAt: Date;
  endsAt: Date;
};

type BookingRange = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Slice an availability window into back-to-back slots of `durationMinutes`.
 * A slot is dropped if it overlaps any provided booking. A leftover at the
 * tail of the window that's smaller than the duration is discarded.
 */
export function sliceWindowIntoSlots(
  window: Window,
  durationMinutes: number,
  windowBookings: BookingRange[]
): Slot[] {
  if (durationMinutes <= 0) return [];

  const slots: Slot[] = [];
  const windowEndMs = window.endsAt.getTime();
  const stepMs = durationMinutes * 60 * 1000;
  let cursorMs = window.startsAt.getTime();

  while (cursorMs + stepMs <= windowEndMs) {
    const startsAt = new Date(cursorMs);
    const endsAt = new Date(cursorMs + stepMs);
    const overlaps = windowBookings.some(
      (b) => b.startsAt < endsAt && b.endsAt > startsAt
    );
    if (!overlaps) {
      slots.push({ startsAt, endsAt });
    }
    cursorMs += stepMs;
  }

  return slots;
}

/**
 * Load active class details, fetch availability windows that overlap the
 * range, fetch confirmed bookings in the range, then derive bookable slots.
 *
 * Bookings block slots across all class types (availability is shared), so
 * we don't filter bookings by `classId`.
 */
export async function getAvailableSlotsForClass(
  classId: number,
  fromDate: Date,
  toDate: Date
): Promise<{
  durationMinutes: number;
  slots: Slot[];
} | null> {
  const classRow = await db
    .select({
      id: classes.id,
      durationMinutes: classTypes.durationMinutes,
      isActive: classes.isActive,
    })
    .from(classes)
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .where(and(eq(classes.id, classId), eq(classes.isActive, true)))
    .limit(1);

  if (classRow.length === 0) return null;
  const { durationMinutes } = classRow[0];

  const [windowRows, bookingRows] = await Promise.all([
    db
      .select({
        startsAt: availabilityWindows.startsAt,
        endsAt: availabilityWindows.endsAt,
      })
      .from(availabilityWindows)
      .where(
        and(
          gte(availabilityWindows.endsAt, fromDate),
          lte(availabilityWindows.startsAt, toDate)
        )
      ),
    db
      .select({
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          gte(bookings.endsAt, fromDate),
          lt(bookings.startsAt, toDate)
        )
      ),
  ]);

  const slots: Slot[] = [];
  for (const window of windowRows) {
    const startsAt = window.startsAt > fromDate ? window.startsAt : fromDate;
    const endsAt = window.endsAt < toDate ? window.endsAt : toDate;
    if (endsAt <= startsAt) continue;

    const windowBookings = bookingRows.filter(
      (b) => b.startsAt < endsAt && b.endsAt > startsAt
    );
    slots.push(
      ...sliceWindowIntoSlots(
        { startsAt, endsAt },
        durationMinutes,
        windowBookings
      )
    );
  }

  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return { durationMinutes, slots };
}
