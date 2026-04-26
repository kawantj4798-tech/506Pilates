import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { classTypes, classes } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Classes",
};

function formatPrice(value: string) {
  const n = Number(value);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(n);
}

/** Display order for private session tiers (title substring match, case-insensitive). */
const PRIVATE_SESSION_TIER_ORDER = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

function privateSessionTierIndex(title: string): number {
  const t = title.toLowerCase();
  const i = PRIVATE_SESSION_TIER_ORDER.findIndex((tier) => t.includes(tier));
  return i === -1 ? PRIVATE_SESSION_TIER_ORDER.length : i;
}

export default async function ClassesPage() {
  const rows = await db
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
    .where(eq(classes.isActive, true));

  const sortedRows = [...rows].sort((a, b) => {
    const da = privateSessionTierIndex(a.title);
    const db = privateSessionTierIndex(b.title);
    if (da !== db) return da - db;
    return a.title.localeCompare(b.title);
  });

  return (
    <main className="mx-auto flex min-w-0 w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 md:gap-8 md:py-8">
      <div className="min-w-0 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          Book Your Session
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          All offerings are private sessions. Choose one to view the schedule
          and reserve your spot.
        </p>
      </div>

      <section
        className="mx-auto min-w-0 max-w-prose space-y-3 md:space-y-4"
        aria-labelledby="private-sessions-heading"
      >
        <h2
          id="private-sessions-heading"
          className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Private session details
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground md:space-y-4 md:text-base">
          <p>
            Private sessions are a one-on-one Pilates experience tailored to
            you. Each session is designed around your body, goals, and any
            specific needs, whether that is injury recovery, building strength,
            or improving flexibility.
          </p>
          <p>
            You will work with a range of Pilates equipment, including the
            Reformer, Mat, and other specialized apparatus, depending on what
            best supports your progress.
          </p>
          <p>
            Sessions are scheduled based on availability. We ask for at least
            24 hours notice for any cancellations.
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No classes yet</CardTitle>
            <CardDescription>
              Check back soon for new offerings.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="mx-auto flex min-w-0 w-full max-w-lg flex-col gap-3 md:gap-4">
          {sortedRows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/scheduler/${row.id}`}
                className={cn(
                  "block rounded-xl outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "hover:opacity-95"
                )}
              >
                <Card className="min-h-[16rem] min-w-0 border-border/80 ring-1 ring-foreground/10 transition hover:ring-foreground/20">
                  <CardHeader className="min-w-0">
                    <CardTitle className="break-words text-lg">{row.title}</CardTitle>
                    {row.description ? (
                      <CardDescription className="line-clamp-2">
                        {row.description}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="mt-auto min-w-0 text-sm text-muted-foreground">
                    <p className="break-words">
                      {row.durationMinutes} min · {formatPrice(row.price)}
                    </p>
                    {row.instructorName ? (
                      <p className="mt-1 break-words">With {row.instructorName}</p>
                    ) : null}
                    <p className="mt-1 break-words capitalize">
                      {row.format.replaceAll("_", " ")}
                      {row.location ? ` · ${row.location}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
