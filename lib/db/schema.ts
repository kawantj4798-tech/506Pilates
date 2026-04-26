import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
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
 * Bookings reference this row.
 */
export const classes = pgTable("classes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  classTypeId: integer("class_type_id")
    .notNull()
    .references(() => classTypes.id, { onDelete: "cascade" }),
  instructorName: varchar("instructor_name", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
});

/**
 * Admin-published availability blocks (e.g. "Apr 28, 9:00am-12:00pm").
 * The scheduler slices each window into back-to-back slots based on the
 * class type's duration and excludes any that overlap a confirmed booking.
 */
export const availabilityWindows = pgTable(
  "availability_windows",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("availability_windows_starts_at_idx").on(table.startsAt),
  ]
);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
]);

/**
 * A user's reservation of a 1-1 slot. Ownership is tracked via the Clerk
 * `userId`; queries that read or mutate a booking must filter by it.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum().notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bookings_user_id_idx").on(table.userId),
    index("bookings_starts_at_idx").on(table.startsAt),
  ]
);
