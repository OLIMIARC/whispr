import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ---- Whispr domain models (optional server persistence) ----

export const confessionCategoryEnum = pgEnum("confession_category", [
  "confession",
  "hot-take",
  "rant",
  "wholesome",
  "after-dark",
]);

export const marketCategoryEnum = pgEnum("market_category", [
  "textbooks",
  "electronics",
  "dorm",
  "clothing",
  "services",
  "tickets",
  "other",
]);

export const marketConditionEnum = pgEnum("market_condition", [
  "new",
  "like-new",
  "good",
  "fair",
]);

// Keep reactions as arrays of userIds, mirroring the client storage model.
export const confessions = pgTable("confessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  authorAlias: text("author_alias").notNull(),
  authorAvatarIndex: integer("author_avatar_index").notNull(),
  authorKarma: integer("author_karma").notNull().default(0),
  category: confessionCategoryEnum("category").notNull(),
  reactions: jsonb("reactions")
    .$type<{
      fire: string[];
      heart: string[];
      laugh: string[];
      shock: string[];
      sad: string[];
    }>()
    .notNull(),
  commentCount: integer("comment_count").notNull().default(0),
  isAfterDark: boolean("is_after_dark").notNull().default(false),
  // Media support
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // "image" | "video"
  mediaThumbnail: text("media_thumbnail"), // thumbnail for videos
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const crushes = pgTable("crushes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromUserId: text("from_user_id").notNull(),
  toAlias: text("to_alias").notNull(),
  message: text("message").notNull(),
  isRevealed: boolean("is_revealed").notNull().default(false),
  isMutual: boolean("is_mutual").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const marketItems = pgTable("market_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  category: marketCategoryEnum("category").notNull(),
  condition: marketConditionEnum("condition").notNull(),
  sellerId: text("seller_id").notNull(),
  sellerAlias: text("seller_alias").notNull(),
  sellerKarma: integer("seller_karma").notNull().default(0),
  sellerAvatarIndex: integer("seller_avatar_index").notNull(),
  isSold: boolean("is_sold").notNull().default(false),
  // Media support (up to 3 images stored as JSON array)
  imageUrls: jsonb("image_urls").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Comments table for confessions and marketplace items
export const comments = pgTable("comments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  confessionId: varchar("confession_id").references(() => confessions.id, { onDelete: "cascade" }),
  marketItemId: varchar("market_item_id").references(() => marketItems.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorAlias: text("author_alias").notNull(),
  authorAvatarIndex: integer("author_avatar_index").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
