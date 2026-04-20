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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Book a class
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a class to view the schedule and reserve a spot.
        </p>
      </div>

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
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/scheduler/${row.id}`}
                className={cn(
                  "block rounded-xl outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "hover:opacity-95"
                )}
              >
                <Card className="h-full border-border/80 ring-1 ring-foreground/10 transition hover:ring-foreground/20">
                  <CardHeader>
                    <CardTitle className="text-lg">{row.title}</CardTitle>
                    {row.description ? (
                      <CardDescription className="line-clamp-2">
                        {row.description}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      {row.durationMinutes} min · {formatPrice(row.price)}
                    </p>
                    {row.instructorName ? (
                      <p className="mt-1">With {row.instructorName}</p>
                    ) : null}
                    <p className="mt-1 capitalize">
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
