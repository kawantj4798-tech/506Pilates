import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Editable marketing / studio copy (e.g. About page). */
export const aboutContent = pgTable("about_content", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar({ length: 128 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  body: text().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Catalog of offerings (mat, reformer, workshop, etc.). */
export const classTypes = pgTable("class_types", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  durationMinutes: integer("duration_minutes").notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  /** e.g. virtual | in_person */
  format: varchar({ length: 32 }).notNull(),
  location: varchar({ length: 255 }),
});

/**
 * A concrete offering tied to a class type (instructor, active series).
 * Scheduled sessions reference this row.
 */
export const classes = pgTable("classes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  classTypeId: integer("class_type_id")
    .notNull()
    .references(() => classTypes.id, { onDelete: "cascade" }),
  instructorName: varchar("instructor_name", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
});

/** Bookable session on the calendar (date/time in UTC; display with a timezone in the app). */
export const scheduledClasses = pgTable("scheduled_classes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  capacity: integer().notNull().default(1),
});
