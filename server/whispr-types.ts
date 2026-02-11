import { z } from "zod";

// These types intentionally mirror the client-side AsyncStorage models in lib/storage.ts.
// They allow the server to persist and broadcast the same payload shapes without
// forcing any client refactor.

export const confessionCategorySchema = z.enum([
  "confession",
  "hot-take",
  "rant",
  "wholesome",
  "after-dark",
]);

export const reactionTypeSchema = z.enum([
  "fire",
  "heart",
  "laugh",
  "shock",
  "sad",
]);

export const reactionsSchema = z.object({
  fire: z.array(z.string()),
  heart: z.array(z.string()),
  laugh: z.array(z.string()),
  shock: z.array(z.string()),
  sad: z.array(z.string()),
});

export const confessionSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  authorAlias: z.string(),
  authorAvatarIndex: z.number().int().min(0),
  authorKarma: z.number().int().min(0),
  category: confessionCategorySchema,
  reactions: reactionsSchema,
  commentCount: z.number().int().min(0),
  isAfterDark: z.boolean(),
  createdAt: z.string(),
});

export type Confession = z.infer<typeof confessionSchema>;

export const createConfessionSchema = confessionSchema
  .omit({ id: true, createdAt: true, reactions: true, commentCount: true })
  .extend({
    // allow client to omit some author fields; server will default safely
    authorKarma: z.number().int().min(0).optional(),
    isAfterDark: z.boolean().optional(),
  });

export const toggleReactionSchema = z.object({
  userId: z.string().min(1),
  reactionType: reactionTypeSchema,
});

export const crushSchema = z.object({
  id: z.string(),
  fromUserId: z.string(),
  toAlias: z.string(),
  message: z.string(),
  isRevealed: z.boolean(),
  isMutual: z.boolean(),
  createdAt: z.string(),
});

export type Crush = z.infer<typeof crushSchema>;

export const createCrushSchema = crushSchema.omit({
  id: true,
  createdAt: true,
  isRevealed: true,
  isMutual: true,
});

export const marketCategorySchema = z.enum([
  "textbooks",
  "electronics",
  "dorm",
  "clothing",
  "services",
  "tickets",
  "other",
]);

export const marketConditionSchema = z.enum(["new", "like-new", "good", "fair"]);

export const marketItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: marketCategorySchema,
  condition: marketConditionSchema,
  sellerId: z.string(),
  sellerAlias: z.string(),
  sellerKarma: z.number().int().min(0),
  sellerAvatarIndex: z.number().int().min(0),
  isSold: z.boolean(),
  createdAt: z.string(),
});

export type MarketItem = z.infer<typeof marketItemSchema>;

export const createMarketItemSchema = marketItemSchema.omit({
  id: true,
  createdAt: true,
  isSold: true,
});

// Comment schema
export const commentSchema = z.object({
  id: z.string(),
  confessionId: z.string().optional(),
  marketItemId: z.string().optional(),
  authorId: z.string(),
  authorAlias: z.string(),
  authorAvatarIndex: z.number().int().min(0),
  content: z.string().max(280),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;
