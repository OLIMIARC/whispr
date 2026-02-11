import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const LIMITS = {
  MAX_CONFESSION_LENGTH: 500,
  MAX_CRUSH_MESSAGE_LENGTH: 200,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 300,
  MIN_PRICE: 0,
  MAX_PRICE: 99999,
  REACTION_COOLDOWN_MS: 500,
};

const KEYS = {
  USER_PROFILE: "whispr_user_profile",
};

// --- Interfaces ---

export interface UserProfile {
  id: string;
  alias: string;
  avatarIndex: number;
  karma: number;
  confessionsCount: number;
  reactionsGiven: number;
  crushesSent: number;
  matchesRevealed: number;
  createdAt: string;
  lastReactionAt: string;
}

export interface Confession {
  id: string;
  content: string;
  authorId: string;
  authorAlias: string;
  authorAvatarIndex: number;
  authorKarma: number;
  category: "confession" | "hot-take" | "rant" | "wholesome" | "after-dark";
  reactions: {
    fire: string[];
    heart: string[];
    laugh: string[];
    shock: string[];
    sad: string[];
  };
  commentCount: number;
  isAfterDark: boolean;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaThumbnail?: string;
}

export interface Crush {
  id: string;
  fromUserId: string;
  toAlias: string;
  message: string;
  isRevealed: boolean;
  isMutual: boolean;
  createdAt: string;
}

export interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: "textbooks" | "electronics" | "dorm" | "clothing" | "services" | "tickets" | "other";
  condition: "new" | "like-new" | "good" | "fair";
  sellerId: string;
  sellerAlias: string;
  sellerKarma: number;
  sellerAvatarIndex: number;
  isSold: boolean;
  createdAt: string;
  imageUrls?: string[];
}

export interface Comment {
  id: string;
  parentId: string;
  parentType: "confession" | "market";
  content: string;
  authorId: string;
  authorAlias: string;
  authorAvatarIndex: number;
  authorKarma: number;
  createdAt: string;
  likes: string[];
}

// --- Helpers ---

const AVATAR_ALIASES = [
  "Shadow Fox", "Neon Ghost", "Midnight Owl", "Pixel Phantom",
  "Cosmic Drift", "Velvet Storm", "Arctic Flame", "Lucid Haze",
  "Echo Pulse", "Silent Spark", "Crimson Tide", "Cipher Wave",
  "Nova Dust", "Thunder Ink", "Prism Shade", "Astral Blur",
  "Iron Mist", "Onyx Glow", "Twilight Ash", "Crystal Veil",
];

export function getRandomAlias(): string {
  return AVATAR_ALIASES[Math.floor(Math.random() * AVATAR_ALIASES.length)];
}

export function getRandomAvatarIndex(): number {
  return Math.floor(Math.random() * 12);
}

export function generateId(): string {
  return Crypto.randomUUID();
}

export function isAfterDarkHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 5;
}

export function getKarmaLevel(karma: number): "low" | "medium" | "high" | "legendary" {
  if (karma >= 500) return "legendary";
  if (karma >= 200) return "high";
  if (karma >= 50) return "medium";
  return "low";
}

export function getKarmaTitle(karma: number): string {
  if (karma >= 500) return "Campus Legend";
  if (karma >= 200) return "Whispr Elite";
  if (karma >= 50) return "Regular";
  return "Newcomer";
}

export function getTimeSince(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

function validatePrice(price: number): number {
  if (!Number.isFinite(price) || price < LIMITS.MIN_PRICE) return 0;
  if (price > LIMITS.MAX_PRICE) return LIMITS.MAX_PRICE;
  return Math.round(price * 100) / 100;
}

function isReactionCooldownActive(lastReactionAt: string): boolean {
  const now = Date.now();
  const last = new Date(lastReactionAt).getTime();
  return now - last < LIMITS.REACTION_COOLDOWN_MS;
}

// --- Mappers ---

function mapConfession(row: any): Confession {
  return {
    id: row.id,
    content: row.content,
    category: row.category,
    authorId: row.author_id,
    authorAlias: row.author_alias,
    authorAvatarIndex: row.author_avatar_index,
    authorKarma: row.author_karma,
    reactions: row.reactions || { fire: [], heart: [], laugh: [], shock: [], sad: [] },
    commentCount: row.comment_count || 0,
    isAfterDark: row.is_after_dark,
    createdAt: row.created_at,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    mediaThumbnail: row.media_thumbnail,
  };
}

function mapCrush(row: any): Crush {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toAlias: row.to_alias,
    message: row.message,
    isRevealed: row.is_revealed,
    isMutual: row.is_mutual,
    createdAt: row.created_at,
  };
}

function mapMarketItem(row: any): MarketItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    condition: row.condition,
    sellerId: row.seller_id,
    sellerAlias: row.seller_alias,
    sellerKarma: row.seller_karma,
    sellerAvatarIndex: row.seller_avatar_index,
    isSold: row.is_sold,
    createdAt: row.created_at,
    imageUrls: row.image_urls,
  };
}

function mapComment(row: any): Comment {
  return {
    id: row.id,
    parentId: row.parent_id,
    parentType: row.parent_type,
    content: row.content,
    authorId: row.author_id,
    authorAlias: row.author_alias,
    authorAvatarIndex: row.author_avatar_index,
    authorKarma: row.author_karma,
    createdAt: row.created_at,
    likes: row.likes || [],
  };
}

// --- User Profile (Local Only) ---

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function createUserProfile(): Promise<UserProfile> {
  const profile: UserProfile = {
    id: generateId(),
    alias: getRandomAlias(),
    avatarIndex: getRandomAvatarIndex(),
    karma: 10,
    confessionsCount: 0,
    reactionsGiven: 0,
    crushesSent: 0,
    matchesRevealed: 0,
    createdAt: new Date().toISOString(),
    lastReactionAt: new Date(0).toISOString(),
  };
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  return profile;
}

export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile();
  if (!current) throw new Error("No profile found");
  const updated = { ...current, ...updates };
  if (updated.karma < 0) updated.karma = 0;
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updated));
  return updated;
}

export async function regenerateAlias(): Promise<UserProfile> {
  const current = await getUserProfile();
  if (!current) throw new Error("No profile found");
  const updated = { ...current, alias: getRandomAlias(), avatarIndex: getRandomAvatarIndex() };
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updated));
  return updated;
}

// --- Confessions (Supabase) ---

export async function getConfessions(): Promise<Confession[]> {
  const { data, error } = await supabase.from('confessions').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map(mapConfession);
}

export async function addConfession(confession: Omit<Confession, "id" | "createdAt" | "reactions" | "commentCount">): Promise<Confession | null> {
  const sanitizedContent = sanitizeText(confession.content, LIMITS.MAX_CONFESSION_LENGTH);
  if (sanitizedContent.length < 3 && !confession.mediaUrl) return null;

  const payload = {
    content: sanitizedContent,
    category: confession.category,
    author_id: confession.authorId,
    author_alias: confession.authorAlias,
    author_avatar_index: confession.authorAvatarIndex,
    author_karma: confession.authorKarma,
    is_after_dark: confession.isAfterDark,
    media_url: confession.mediaUrl,
    media_type: confession.mediaType,
    media_thumbnail: confession.mediaThumbnail,
  };

  const { data, error } = await supabase.from('confessions').insert(payload).select().single();
  if (error) { console.error(error); return null; }
  return mapConfession(data);
}

export async function deleteConfession(confessionId: string, userId: string): Promise<Confession[]> {
  const { error } = await supabase.from('confessions').delete().eq('id', confessionId).eq('author_id', userId);
  if (error) console.error(error);
  return getConfessions();
}

export async function toggleReaction(confessionId: string, userId: string, reactionType: keyof Confession["reactions"]): Promise<{ confessions: Confession[]; added: boolean }> {
  const profile = await getUserProfile();
  if (profile && isReactionCooldownActive(profile.lastReactionAt)) {
    return { confessions: await getConfessions(), added: false }; // Optimistic UI would be better but keeping simple
  }

  const { data: row, error } = await supabase.from('confessions').select('*').eq('id', confessionId).single();
  if (error || !row) return { confessions: await getConfessions(), added: false };

  if (row.author_id === userId) return { confessions: await getConfessions(), added: false };

  const reactions = row.reactions || { fire: [], heart: [], laugh: [], shock: [], sad: [] };
  const list = reactions[reactionType] || [];
  const index = list.indexOf(userId);

  let added = false;
  if (index === -1) { list.push(userId); added = true; }
  else { list.splice(index, 1); added = false; }
  reactions[reactionType] = list;

  await supabase.from('confessions').update({ reactions }).eq('id', confessionId);

  if (profile && added) {
    await updateUserProfile({ lastReactionAt: new Date().toISOString() });
  }
  return { confessions: await getConfessions(), added };
}

// --- Crushes (Supabase) ---

export async function getCrushes(): Promise<Crush[]> {
  const { data, error } = await supabase.from('crushes').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map(mapCrush);
}

export async function sendCrush(crush: Omit<Crush, "id" | "createdAt" | "isRevealed" | "isMutual">): Promise<Crush | null> {
  const sanitizedAlias = sanitizeText(crush.toAlias, 30);
  const sanitizedMessage = sanitizeText(crush.message, LIMITS.MAX_CRUSH_MESSAGE_LENGTH);
  if (sanitizedAlias.length < 2) return null;

  // Check duplicate logic skipped for simple cloud migration - rely on DB constraints or just allow it for MVP

  const payload = {
    from_user_id: crush.fromUserId,
    to_alias: sanitizedAlias,
    message: sanitizedMessage,
    is_revealed: false,
    is_mutual: Math.random() > 0.6, // Still verifying randomization locally for MVP fun
  };

  const { data, error } = await supabase.from('crushes').insert(payload).select().single();
  if (error) return null;
  return mapCrush(data);
}

export async function deleteCrush(crushId: string, userId: string): Promise<Crush[]> {
  await supabase.from('crushes').delete().eq('id', crushId).eq('from_user_id', userId);
  return getCrushes();
}

export async function revealCrush(crushId: string): Promise<Crush[]> {
  await supabase.from('crushes').update({ is_revealed: true }).eq('id', crushId);
  return getCrushes();
}

// --- Market (Supabase) ---

export async function getMarketItems(): Promise<MarketItem[]> {
  const { data, error } = await supabase.from('market_items').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map(mapMarketItem);
}

export async function addMarketItem(item: Omit<MarketItem, "id" | "createdAt" | "isSold">): Promise<MarketItem | null> {
  const sanitizedTitle = sanitizeText(item.title, LIMITS.MAX_TITLE_LENGTH);
  const sanitizedDesc = sanitizeText(item.description, LIMITS.MAX_DESCRIPTION_LENGTH);
  const validatedPrice = validatePrice(item.price);
  if (sanitizedTitle.length < 3 || validatedPrice <= 0) return null;

  const payload = {
    title: sanitizedTitle,
    description: sanitizedDesc,
    price: validatedPrice,
    category: item.category,
    condition: item.condition,
    seller_id: item.sellerId,
    seller_alias: item.sellerAlias,
    seller_karma: item.sellerKarma,
    seller_avatar_index: item.sellerAvatarIndex,
    is_sold: false,
    image_urls: item.imageUrls || [],
  };

  const { data, error } = await supabase.from('market_items').insert(payload).select().single();
  if (error) return null;
  return mapMarketItem(data);
}

export async function deleteMarketItem(itemId: string, userId: string): Promise<MarketItem[]> {
  await supabase.from('market_items').delete().eq('id', itemId).eq('seller_id', userId);
  return getMarketItems();
}

export async function toggleSold(itemId: string, userId: string): Promise<MarketItem[]> {
  const { data: row } = await supabase.from('market_items').select('is_sold, seller_id').eq('id', itemId).single();
  if (row && row.seller_id === userId) {
    await supabase.from('market_items').update({ is_sold: !row.is_sold }).eq('id', itemId);
  }
  return getMarketItems();
}

// --- Comments (Supabase) ---

export async function getComments(parentId: string): Promise<Comment[]> {
  const { data, error } = await supabase.from('comments').select('*').eq('parent_id', parentId).order('created_at', { ascending: true });
  if (error) return [];
  return data.map(mapComment);
}

export async function addComment(comment: Omit<Comment, "id" | "createdAt" | "likes">): Promise<Comment | null> {
  const sanitizedContent = sanitizeText(comment.content, 300);
  if (sanitizedContent.length < 1) return null;

  const payload = {
    parent_id: comment.parentId,
    parent_type: comment.parentType,
    content: sanitizedContent,
    author_id: comment.authorId,
    author_alias: comment.authorAlias,
    author_avatar_index: comment.authorAvatarIndex,
    author_karma: comment.authorKarma,
    likes: [],
  };

  const { data, error } = await supabase.from('comments').insert(payload).select().single();
  if (error) { console.error(error); return null; }

  // Increment comment count for confessions
  if (comment.parentType === "confession") {
    // Can't use atomic increment easily via simple insert, fetch and update or RPC. 
    // For simple MVP:
    const { data: conf } = await supabase.from('confessions').select('comment_count').eq('id', comment.parentId).single();
    if (conf) {
      await supabase.from('confessions').update({ comment_count: conf.comment_count + 1 }).eq('id', comment.parentId);
    }
  }

  return mapComment(data);
}

export async function deleteComment(commentId: string, parentId: string, parentType: "confession" | "market"): Promise<void> {
  await supabase.from('comments').delete().eq('id', commentId);

  if (parentType === "confession") {
    const { data: conf } = await supabase.from('confessions').select('comment_count').eq('id', parentId).single();
    if (conf && conf.comment_count > 0) {
      await supabase.from('confessions').update({ comment_count: conf.comment_count - 1 }).eq('id', parentId);
    }
  }
}

// Stub function for app context compatibility (removed seed logic)
export async function seedSampleData(): Promise<void> {
  // No-op for cloud backend to avoid spamming the shared DB
}
