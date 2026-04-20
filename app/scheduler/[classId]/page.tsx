import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { addDays } from "date-fns";
import { and, asc, eq, gte, lt } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { classTypes, classes, scheduledClasses } from "@/lib/db/schema";
import { getStudioTimeZone } from "@/lib/studio-timezone";
import { CalendarIcon } from "lucide-react";

import { SchedulerDatePicker } from "./scheduler-date-picker";

const schedulerParamsSchema = z.object({
  classId: z.coerce.number().int().positive(),
});

const ymdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [y, mo, d] = s.split("-").map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === mo - 1 &&
      dt.getUTCDate() === d
    );
  });

function firstString(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type PageProps = {
  params: Promise<{ classId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { classId: raw } = await params;
  const parsed = schedulerParamsSchema.safeParse({ classId: raw });
  if (!parsed.success) {
    return { title: "Class" };
  }

  const row = await db
    .select({ title: classTypes.title })
    .from(classes)
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .where(
      and(eq(classes.id, parsed.data.classId), eq(classes.isActive, true))
    )
    .limit(1);

  if (row.length === 0) {
    return { title: "Class" };
  }

  return {
    title: `Schedule · ${row[0].title}`,
  };
}

function formatPrice(value: string) {
  const n = Number(value);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(n);
}

export default async function SchedulerPage({
  params,
  searchParams,
}: PageProps) {
  const { classId: raw } = await params;
  const parsed = schedulerParamsSchema.safeParse({ classId: raw });
  if (!parsed.success) {
    notFound();
  }

  const row = await db
    .select({
      id: classes.id,
      instructorName: classes.instructorName,
      title: classTypes.title,
      description: classTypes.description,
      durationMinutes: classTypes.durationMinutes,
      price: classTypes.price,
      format: classTypes.format,
      location: classTypes.location,
    })
    .from(classes)
    .innerJoin(classTypes, eq(classes.classTypeId, classTypes.id))
    .where(
      and(eq(classes.id, parsed.data.classId), eq(classes.isActive, true))
    )
    .limit(1);

  if (row.length === 0) {
    notFound();
  }

  const c = row[0];
  const classId = parsed.data.classId;

  const sp: Record<string, string | string[] | undefined> = searchParams
    ? await searchParams
    : {};
  const dateRaw = firstString(sp["date"]);
  const ymdParsed = ymdSchema.safeParse(dateRaw);

  const studioTz = getStudioTimeZone();
  const now = new Date();
  const windowEnd = addDays(now, 90);
  const todayYmd = formatInTimeZone(now, studioTz, "yyyy-MM-dd");

  const upcomingRows = await db
    .select({
      id: scheduledClasses.id,
      startsAt: scheduledClasses.startsAt,
      capacity: scheduledClasses.capacity,
    })
    .from(scheduledClasses)
    .where(
      and(
        eq(scheduledClasses.classId, classId),
        gte(scheduledClasses.startsAt, now),
        lt(scheduledClasses.startsAt, windowEnd)
      )
    )
    .orderBy(asc(scheduledClasses.startsAt));

  const availableDatesYmd = [
    ...new Set(
      upcomingRows.map((r) =>
        formatInTimeZone(r.startsAt, studioTz, "yyyy-MM-dd")
      )
    ),
  ].sort();

  const firstUpcomingYmd = availableDatesYmd.find((d) => d >= todayYmd);

  let selectedYmd: string;
  if (ymdParsed.success) {
    const d = ymdParsed.data;
    if (d < todayYmd) {
      selectedYmd = firstUpcomingYmd ?? todayYmd;
    } else {
      selectedYmd = d;
    }
  } else {
    selectedYmd = firstUpcomingYmd ?? todayYmd;
  }

  const sessionsThisDay = upcomingRows.filter(
    (r) => formatInTimeZone(r.startsAt, studioTz, "yyyy-MM-dd") === selectedYmd
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl sm:text-3xl">
            {c.title}
          </CardTitle>
          <CardDescription className="text-base">
            {c.durationMinutes} minutes · {formatPrice(c.price)}
            {c.instructorName ? ` · ${c.instructorName}` : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>
            {upcomingRows.length === 0
              ? "No sessions are scheduled in the next 90 days."
              : "Choose a date with an available session, then pick a time."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Suspense
            fallback={
              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full justify-start sm:w-[min(100%,280px)]"
              >
                <CalendarIcon className="mr-2 size-4 shrink-0" />
                Loading calendar…
              </Button>
            }
          >
            <SchedulerDatePicker
              studioTimeZone={studioTz}
              selectedDateYmd={selectedYmd}
              availableDatesYmd={availableDatesYmd}
            />
          </Suspense>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              Sessions on{" "}
              {formatInTimeZone(
                toDate(`${selectedYmd}T12:00:00`, { timeZone: studioTz }),
                studioTz,
                "EEEE, MMM d, yyyy"
              )}
            </p>
            {sessionsThisDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions on this date. Try another day with availability.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessionsThisDay.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <span className="text-sm font-medium tabular-nums">
                      {formatInTimeZone(
                        s.startsAt,
                        studioTz,
                        "h:mm a zzz"
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {s.capacity}{" "}
                      {s.capacity === 1 ? "spot" : "spots"}
                    </span>
                    <Button type="button" variant="secondary" size="sm" disabled>
                      Book soon
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
