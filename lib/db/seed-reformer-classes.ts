import "dotenv/config";

import { db } from "@/lib/db";
import { classTypes, classes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const offerings = [
  {
    title: "Beginner Reformer Class",
    description:
      "Foundations on the reformer: alignment, breathing, and essential movements in a supportive setting.",
  },
  {
    title: "Intermediate Reformer Class",
    description:
      "Build strength and flow with more challenging sequences and spring variations.",
  },
  {
    title: "Advanced Reformer Class",
    description:
      "High-intensity reformer work for experienced movers ready for complex choreography and tempo.",
  },
] as const;

async function main() {
  for (const offering of offerings) {
    const existing = await db
      .select({ id: classTypes.id })
      .from(classTypes)
      .where(eq(classTypes.title, offering.title))
      .limit(1);

    let classTypeId: number;
    if (existing[0]) {
      classTypeId = existing[0].id;
    } else {
      const [inserted] = await db
        .insert(classTypes)
        .values({
          title: offering.title,
          description: offering.description,
          durationMinutes: 60,
          price: "45.00",
          imageUrl: null,
          format: "in_person",
          location: null,
        })
        .returning({ id: classTypes.id });
      classTypeId = inserted.id;
    }

    const classRow = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.classTypeId, classTypeId))
      .limit(1);

    if (!classRow[0]) {
      await db.insert(classes).values({
        classTypeId,
        instructorName: null,
        isActive: true,
      });
    }
  }
}

main()
  .then(() => {
    console.log("Reformer classes seeded.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
