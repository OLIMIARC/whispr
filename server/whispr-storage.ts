import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  Confession,
  Crush,
  MarketItem,
  Comment,
  confessionCategorySchema,
  marketCategorySchema,
  marketConditionSchema,
  reactionsSchema,
  reactionTypeSchema,
} from "./whispr-types";

// ---- Limits & validation mirrored from lib/storage.ts ----

const LIMITS = {
  MAX_CONFESSIONS: 200,
  MAX_CRUSHES: 100,
  MAX_MARKET_ITEMS: 150,
  MAX_COMMENTS: 500,
  MAX_CONFESSION_LENGTH: 500,
  MAX_CRUSH_MESSAGE_LENGTH: 200,
  MAX_COMMENT_LENGTH: 280,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 300,
  MIN_PRICE: 0,
  MAX_PRICE: 99999,
};

function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

function validatePrice(price: number): number {
  if (!Number.isFinite(price) || price < LIMITS.MIN_PRICE) return 0;
  if (price > LIMITS.MAX_PRICE) return LIMITS.MAX_PRICE;
  return Math.round(price * 100) / 100;
}

export type SortMode = "recent" | "trending";

type PersistedState = {
  confessions: Confession[];
  crushes: Crush[];
  marketItems: MarketItem[];
  comments: Comment[];
};

const DEFAULT_STATE: PersistedState = {
  confessions: [],
  crushes: [],
  marketItems: [],
  comments: [],
};

export class WhisprStore {
  private state: PersistedState;
  private readonly filePath: string;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts?: { filePath?: string }) {
    const dataDir = path.resolve(process.cwd(), ".data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this.filePath =
      opts?.filePath ?? path.resolve(dataDir, "whispr-state.json");
    this.state = this.load();
  }

  private load(): PersistedState {
    try {
      if (!fs.existsSync(this.filePath)) return { ...DEFAULT_STATE };
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      // Best-effort validation. If corrupted, reset rather than crashing.
      return {
        confessions: Array.isArray(parsed.confessions)
          ? parsed.confessions
          : [],
        crushes: Array.isArray(parsed.crushes) ? parsed.crushes : [],
        marketItems: Array.isArray(parsed.marketItems)
          ? parsed.marketItems
          : [],
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private schedulePersist() {
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      try {
        fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
      } catch (e) {
        // Non-fatal: keep in-memory state.
        console.error("Failed to persist Whispr state:", e);
      }
    }, 250);
  }

  // ---- Confessions ----

  listConfessions(opts?: {
    sort?: SortMode;
    category?: string;
    limit?: number;
  }): Confession[] {
    const sort = opts?.sort ?? "recent";
    const limit = Math.max(1, Math.min(opts?.limit ?? 100, 200));
    let items = [...this.state.confessions];

    if (opts?.category) {
      const cat = confessionCategorySchema.safeParse(opts.category);
      if (cat.success) {
        items = items.filter((c) => c.category === cat.data);
      }
    }

    if (sort === "trending") {
      items.sort((a, b) => this.trendingScore(b) - this.trendingScore(a));
    } else {
      items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return items.slice(0, limit);
  }

  createConfession(input: {
    content: string;
    authorId: string;
    authorAlias: string;
    authorAvatarIndex: number;
    authorKarma?: number;
    category: string;
    isAfterDark?: boolean;
  }): Confession | null {
    const category = confessionCategorySchema.safeParse(input.category);
    if (!category.success) return null;

    const content = sanitizeText(input.content, LIMITS.MAX_CONFESSION_LENGTH);
    if (content.length < 3) return null;

    const confession: Confession = {
      id: randomUUID(),
      content,
      authorId: input.authorId,
      authorAlias: sanitizeText(input.authorAlias, 40) || "Anonymous",
      authorAvatarIndex: Number.isFinite(input.authorAvatarIndex)
        ? Math.max(0, Math.floor(input.authorAvatarIndex))
        : 0,
      authorKarma: Math.max(0, Math.floor(input.authorKarma ?? 0)),
      category: category.data,
      reactions: { fire: [], heart: [], laugh: [], shock: [], sad: [] },
      commentCount: 0,
      isAfterDark: Boolean(input.isAfterDark),
      createdAt: new Date().toISOString(),
    };

    this.state.confessions.unshift(confession);
    if (this.state.confessions.length > LIMITS.MAX_CONFESSIONS) {
      this.state.confessions.splice(LIMITS.MAX_CONFESSIONS);
    }
    this.schedulePersist();
    return confession;
  }

  deleteConfession(id: string, authorId: string): boolean {
    const before = this.state.confessions.length;
    this.state.confessions = this.state.confessions.filter(
      (c) => !(c.id === id && c.authorId === authorId),
    );
    const changed = this.state.confessions.length !== before;
    if (changed) this.schedulePersist();
    return changed;
  }

  toggleReaction(opts: {
    confessionId: string;
    userId: string;
    reactionType: string;
  }): { confession: Confession | null; added: boolean } {
    const reactionType = reactionTypeSchema.safeParse(opts.reactionType);
    if (!reactionType.success) return { confession: null, added: false };

    const idx = this.state.confessions.findIndex((c) => c.id === opts.confessionId);
    if (idx === -1) return { confession: null, added: false };

    const c = this.state.confessions[idx];
    if (c.authorId === opts.userId) return { confession: c, added: false };

    const list = c.reactions[reactionType.data];
    const exists = list.includes(opts.userId);
    const nextList = exists ? list.filter((x) => x !== opts.userId) : [...list, opts.userId];
    const next = {
      ...c,
      reactions: { ...c.reactions, [reactionType.data]: nextList },
    };

    // Validate shape to avoid corrupting state
    const ok = reactionsSchema.safeParse(next.reactions);
    if (!ok.success) return { confession: c, added: false };

    this.state.confessions[idx] = next;
    this.schedulePersist();
    return { confession: next, added: !exists };
  }

  private trendingScore(c: Confession): number {
    const weights: Record<keyof Confession["reactions"], number> = {
      fire: 3,
      heart: 2,
      laugh: 2,
      shock: 1.5,
      sad: 1,
    };

    const keys = Object.keys(c.reactions) as Array<keyof Confession["reactions"]>;
    const raw = keys.reduce<number>((sum, key) => {
      return sum + c.reactions[key].length * weights[key];
    }, 0);
    const ageHours = Math.max(
      0,
      (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const decay = 1 / Math.pow(1 + ageHours / 12, 1.3);
    return raw * decay;
  }

  // ---- Crushes ----

  listCrushes(userId: string): Crush[] {
    return this.state.crushes
      .filter((c) => c.fromUserId === userId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, LIMITS.MAX_CRUSHES);
  }

  createCrush(input: { fromUserId: string; toAlias: string; message: string }): Crush | null {
    const toAlias = sanitizeText(input.toAlias, 40);
    const message = sanitizeText(input.message, LIMITS.MAX_CRUSH_MESSAGE_LENGTH);
    if (toAlias.length < 2 || message.length < 2) return null;

    // Duplicate prevention: per-fromUserId per-toAlias
    const dup = this.state.crushes.some(
      (c) => c.fromUserId === input.fromUserId && c.toAlias.toLowerCase() === toAlias.toLowerCase(),
    );
    if (dup) return null;

    const crush: Crush = {
      id: randomUUID(),
      fromUserId: input.fromUserId,
      toAlias,
      message,
      isRevealed: false,
      isMutual: false,
      createdAt: new Date().toISOString(),
    };

    this.state.crushes.unshift(crush);
    if (this.state.crushes.length > LIMITS.MAX_CRUSHES) {
      this.state.crushes.splice(LIMITS.MAX_CRUSHES);
    }
    this.schedulePersist();
    return crush;
  }

  deleteCrush(id: string, fromUserId: string): boolean {
    const before = this.state.crushes.length;
    this.state.crushes = this.state.crushes.filter(
      (c) => !(c.id === id && c.fromUserId === fromUserId),
    );
    const changed = this.state.crushes.length !== before;
    if (changed) this.schedulePersist();
    return changed;
  }

  revealCrush(id: string, fromUserId: string): Crush | null {
    const idx = this.state.crushes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const c = this.state.crushes[idx];
    if (c.fromUserId !== fromUserId) return null;
    const next = { ...c, isRevealed: true };
    this.state.crushes[idx] = next;
    this.schedulePersist();
    return next;
  }

  // ---- Marketplace ----

  listMarketItems(opts?: { category?: string; limit?: number }): MarketItem[] {
    const limit = Math.max(1, Math.min(opts?.limit ?? 100, 150));
    let items = [...this.state.marketItems];
    if (opts?.category) {
      const cat = marketCategorySchema.safeParse(opts.category);
      if (cat.success) items = items.filter((i) => i.category === cat.data);
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, limit);
  }

  createMarketItem(input: Omit<MarketItem, "id" | "createdAt" | "isSold">): MarketItem | null {
    const title = sanitizeText(input.title, LIMITS.MAX_TITLE_LENGTH);
    const description = sanitizeText(input.description, LIMITS.MAX_DESCRIPTION_LENGTH);
    if (title.length < 2 || description.length < 2) return null;

    const category = marketCategorySchema.safeParse(input.category);
    const condition = marketConditionSchema.safeParse(input.condition);
    if (!category.success || !condition.success) return null;

    const price = validatePrice(input.price);

    const item: MarketItem = {
      id: randomUUID(),
      title,
      description,
      price,
      category: category.data,
      condition: condition.data,
      sellerId: input.sellerId,
      sellerAlias: sanitizeText(input.sellerAlias, 40) || "Anonymous",
      sellerKarma: Math.max(0, Math.floor(input.sellerKarma ?? 0)),
      sellerAvatarIndex: Math.max(0, Math.floor(input.sellerAvatarIndex ?? 0)),
      isSold: false,
      createdAt: new Date().toISOString(),
    };

    this.state.marketItems.unshift(item);
    if (this.state.marketItems.length > LIMITS.MAX_MARKET_ITEMS) {
      this.state.marketItems.splice(LIMITS.MAX_MARKET_ITEMS);
    }
    this.schedulePersist();
    return item;
  }

  deleteMarketItem(id: string, sellerId: string): boolean {
    const before = this.state.marketItems.length;
    this.state.marketItems = this.state.marketItems.filter(
      (i) => !(i.id === id && i.sellerId === sellerId),
    );
    const changed = this.state.marketItems.length !== before;
    if (changed) this.schedulePersist();
    return changed;
  }

  toggleSold(id: string, sellerId: string): MarketItem | null {
    const idx = this.state.marketItems.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const item = this.state.marketItems[idx];
    if (item.sellerId !== sellerId) return null;
    const next = { ...item, isSold: !item.isSold };
    this.state.marketItems[idx] = next;
    this.schedulePersist();
    return next;
  }

  // ---- Comments ----

  listComments(opts: {
    confessionId?: string;
    marketItemId?: string;
    limit?: number;
  }): Comment[] {
    const limit = Math.max(1, Math.min(opts.limit ?? 100, 200));
    let items = [...this.state.comments];

    if (opts.confessionId) {
      items = items.filter((c) => c.confessionId === opts.confessionId);
    } else if (opts.marketItemId) {
      items = items.filter((c) => c.marketItemId === opts.marketItemId);
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return items.slice(0, limit);
  }

  createComment(input: {
    confessionId?: string;
    marketItemId?: string;
    authorId: string;
    authorAlias: string;
    authorAvatarIndex: number;
    content: string;
  }): Comment | null {
    const content = sanitizeText(input.content, LIMITS.MAX_COMMENT_LENGTH);
    if (content.length < 1) return null;

    if (!input.confessionId && !input.marketItemId) return null;

    const comment: Comment = {
      id: randomUUID(),
      confessionId: input.confessionId,
      marketItemId: input.marketItemId,
      authorId: input.authorId,
      authorAlias: sanitizeText(input.authorAlias, 40) || "Anonymous",
      authorAvatarIndex: Number.isFinite(input.authorAvatarIndex)
        ? Math.max(0, Math.floor(input.authorAvatarIndex))
        : 0,
      content,
      createdAt: new Date().toISOString(),
    };

    this.state.comments.unshift(comment);
    if (this.state.comments.length > LIMITS.MAX_COMMENTS) {
      this.state.comments.splice(LIMITS.MAX_COMMENTS);
    }

    // Update comment count on parent confession
    if (input.confessionId) {
      const confession = this.state.confessions.find(
        (c) => c.id === input.confessionId,
      );
      if (confession) {
        confession.commentCount = (confession.commentCount || 0) + 1;
      }
    }

    this.schedulePersist();
    return comment;
  }

  deleteComment(id: string, authorId: string): boolean {
    const comment = this.state.comments.find((c) => c.id === id);
    if (!comment || comment.authorId !== authorId) return false;

    const before = this.state.comments.length;
    this.state.comments = this.state.comments.filter((c) => c.id !== id);
    const changed = this.state.comments.length !== before;

    // Update comment count on parent confession
    if (changed && comment.confessionId) {
      const confession = this.state.confessions.find(
        (c) => c.id === comment.confessionId,
      );
      if (confession && confession.commentCount > 0) {
        confession.commentCount -= 1;
      }
    }

    if (changed) this.schedulePersist();
    return changed;
  }
}

export const whisprStore = new WhisprStore();
