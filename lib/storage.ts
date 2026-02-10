import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const KEYS = {
  USER_PROFILE: "whispr_user_profile",
  CONFESSIONS: "whispr_confessions",
  CRUSHES: "whispr_crushes",
  MARKETPLACE: "whispr_marketplace",
};

const LIMITS = {
  MAX_CONFESSIONS: 200,
  MAX_CRUSHES: 100,
  MAX_MARKET_ITEMS: 150,
  MAX_CONFESSION_LENGTH: 500,
  MAX_CRUSH_MESSAGE_LENGTH: 200,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 300,
  MIN_PRICE: 0,
  MAX_PRICE: 99999,
  REACTION_COOLDOWN_MS: 500,
};

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
}

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
  if (seconds < 0) return "just now";
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
  let newAlias = getRandomAlias();
  while (newAlias === current.alias) {
    newAlias = getRandomAlias();
  }
  const updated = {
    ...current,
    alias: newAlias,
    avatarIndex: getRandomAvatarIndex(),
  };
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(updated));
  return updated;
}

export async function getConfessions(): Promise<Confession[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONFESSIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addConfession(confession: Omit<Confession, "id" | "createdAt" | "reactions" | "commentCount">): Promise<Confession | null> {
  const sanitizedContent = sanitizeText(confession.content, LIMITS.MAX_CONFESSION_LENGTH);
  if (sanitizedContent.length < 3) return null;

  const confessions = await getConfessions();
  const newConfession: Confession = {
    ...confession,
    content: sanitizedContent,
    id: generateId(),
    reactions: { fire: [], heart: [], laugh: [], shock: [], sad: [] },
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };
  confessions.unshift(newConfession);

  if (confessions.length > LIMITS.MAX_CONFESSIONS) {
    confessions.splice(LIMITS.MAX_CONFESSIONS);
  }

  await AsyncStorage.setItem(KEYS.CONFESSIONS, JSON.stringify(confessions));
  return newConfession;
}

export async function deleteConfession(confessionId: string, userId: string): Promise<Confession[]> {
  const confessions = await getConfessions();
  const filtered = confessions.filter((c) => !(c.id === confessionId && c.authorId === userId));
  await AsyncStorage.setItem(KEYS.CONFESSIONS, JSON.stringify(filtered));
  return filtered;
}

export async function toggleReaction(
  confessionId: string,
  userId: string,
  reactionType: keyof Confession["reactions"]
): Promise<{ confessions: Confession[]; added: boolean }> {
  const profile = await getUserProfile();
  if (profile && isReactionCooldownActive(profile.lastReactionAt)) {
    const confessions = await getConfessions();
    const confession = confessions.find((c) => c.id === confessionId);
    const isActive = confession?.reactions[reactionType].includes(userId) ?? false;
    return { confessions, added: isActive };
  }

  const confessions = await getConfessions();
  const index = confessions.findIndex((c) => c.id === confessionId);
  if (index === -1) return { confessions, added: false };

  const confession = confessions[index];

  if (confession.authorId === userId) {
    return { confessions, added: false };
  }

  const userIndex = confession.reactions[reactionType].indexOf(userId);
  let added = false;
  if (userIndex === -1) {
    confession.reactions[reactionType].push(userId);
    added = true;
  } else {
    confession.reactions[reactionType].splice(userIndex, 1);
    added = false;
  }
  confessions[index] = confession;
  await AsyncStorage.setItem(KEYS.CONFESSIONS, JSON.stringify(confessions));

  if (profile) {
    await updateUserProfile({ lastReactionAt: new Date().toISOString() });
  }

  return { confessions, added };
}

export async function getCrushes(): Promise<Crush[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CRUSHES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function sendCrush(crush: Omit<Crush, "id" | "createdAt" | "isRevealed" | "isMutual">): Promise<Crush | null> {
  const sanitizedAlias = sanitizeText(crush.toAlias, 30);
  const sanitizedMessage = sanitizeText(crush.message, LIMITS.MAX_CRUSH_MESSAGE_LENGTH);
  if (sanitizedAlias.length < 2) return null;

  const crushes = await getCrushes();

  const alreadyCrushed = crushes.some(
    (c) => c.fromUserId === crush.fromUserId && c.toAlias.toLowerCase() === sanitizedAlias.toLowerCase()
  );
  if (alreadyCrushed) return null;

  const newCrush: Crush = {
    ...crush,
    toAlias: sanitizedAlias,
    message: sanitizedMessage,
    id: generateId(),
    isRevealed: false,
    isMutual: Math.random() > 0.6,
    createdAt: new Date().toISOString(),
  };
  crushes.unshift(newCrush);

  if (crushes.length > LIMITS.MAX_CRUSHES) {
    crushes.splice(LIMITS.MAX_CRUSHES);
  }

  await AsyncStorage.setItem(KEYS.CRUSHES, JSON.stringify(crushes));
  return newCrush;
}

export async function deleteCrush(crushId: string, userId: string): Promise<Crush[]> {
  const crushes = await getCrushes();
  const filtered = crushes.filter((c) => !(c.id === crushId && c.fromUserId === userId));
  await AsyncStorage.setItem(KEYS.CRUSHES, JSON.stringify(filtered));
  return filtered;
}

export async function revealCrush(crushId: string): Promise<Crush[]> {
  const crushes = await getCrushes();
  const index = crushes.findIndex((c) => c.id === crushId);
  if (index !== -1) {
    crushes[index].isRevealed = true;
  }
  await AsyncStorage.setItem(KEYS.CRUSHES, JSON.stringify(crushes));
  return crushes;
}

export async function getMarketItems(): Promise<MarketItem[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MARKETPLACE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addMarketItem(item: Omit<MarketItem, "id" | "createdAt" | "isSold">): Promise<MarketItem | null> {
  const sanitizedTitle = sanitizeText(item.title, LIMITS.MAX_TITLE_LENGTH);
  const sanitizedDesc = sanitizeText(item.description, LIMITS.MAX_DESCRIPTION_LENGTH);
  const validatedPrice = validatePrice(item.price);

  if (sanitizedTitle.length < 3) return null;
  if (validatedPrice <= 0) return null;

  const items = await getMarketItems();
  const newItem: MarketItem = {
    ...item,
    title: sanitizedTitle,
    description: sanitizedDesc,
    price: validatedPrice,
    id: generateId(),
    isSold: false,
    createdAt: new Date().toISOString(),
  };
  items.unshift(newItem);

  if (items.length > LIMITS.MAX_MARKET_ITEMS) {
    items.splice(LIMITS.MAX_MARKET_ITEMS);
  }

  await AsyncStorage.setItem(KEYS.MARKETPLACE, JSON.stringify(items));
  return newItem;
}

export async function deleteMarketItem(itemId: string, userId: string): Promise<MarketItem[]> {
  const items = await getMarketItems();
  const filtered = items.filter((i) => !(i.id === itemId && i.sellerId === userId));
  await AsyncStorage.setItem(KEYS.MARKETPLACE, JSON.stringify(filtered));
  return filtered;
}

export async function toggleSold(itemId: string, userId: string): Promise<MarketItem[]> {
  const items = await getMarketItems();
  const index = items.findIndex((i) => i.id === itemId);
  if (index !== -1 && items[index].sellerId === userId) {
    items[index].isSold = !items[index].isSold;
  }
  await AsyncStorage.setItem(KEYS.MARKETPLACE, JSON.stringify(items));
  return items;
}

export async function seedSampleData(): Promise<void> {
  const existingConfessions = await getConfessions();
  if (existingConfessions.length > 0) return;

  const sampleConfessions: Confession[] = [
    {
      id: generateId(),
      content: "I've been sneaking into the library after hours to study because my roommate won't stop playing music. It's actually become my favorite routine.",
      authorId: "sample1",
      authorAlias: "Midnight Owl",
      authorAvatarIndex: 2,
      authorKarma: 145,
      category: "confession",
      reactions: { fire: ["s1", "s2"], heart: ["s3", "s4", "s5"], laugh: [], shock: [], sad: [] },
      commentCount: 12,
      isAfterDark: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: generateId(),
      content: "Hot take: the dining hall pasta is actually elite and I'm tired of people pretending it isn't",
      authorId: "sample2",
      authorAlias: "Neon Ghost",
      authorAvatarIndex: 5,
      authorKarma: 89,
      category: "hot-take",
      reactions: { fire: ["s1", "s2", "s3", "s4"], heart: [], laugh: ["s5", "s6", "s7"], shock: [], sad: [] },
      commentCount: 34,
      isAfterDark: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: generateId(),
      content: "I accidentally called my professor 'mom' today in a 200-person lecture hall. Considering transferring schools.",
      authorId: "sample3",
      authorAlias: "Pixel Phantom",
      authorAvatarIndex: 8,
      authorKarma: 320,
      category: "wholesome",
      reactions: { fire: [], heart: ["s1"], laugh: ["s2", "s3", "s4", "s5", "s6", "s7", "s8"], shock: ["s9"], sad: [] },
      commentCount: 56,
      isAfterDark: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: generateId(),
      content: "The person who always sits behind me in Psych 101... I think about you every day. Your laugh makes the whole lecture worth attending.",
      authorId: "sample4",
      authorAlias: "Silent Spark",
      authorAvatarIndex: 11,
      authorKarma: 67,
      category: "confession",
      reactions: { fire: [], heart: ["s1", "s2", "s3", "s4", "s5", "s6"], laugh: [], shock: [], sad: ["s7"] },
      commentCount: 23,
      isAfterDark: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: generateId(),
      content: "Unpopular opinion: 8am classes are actually superior because you have the rest of the day free. Morning people rise up.",
      authorId: "sample5",
      authorAlias: "Arctic Flame",
      authorAvatarIndex: 3,
      authorKarma: 234,
      category: "hot-take",
      reactions: { fire: ["s1", "s2"], heart: [], laugh: [], shock: ["s3", "s4", "s5", "s6", "s7", "s8", "s9"], sad: [] },
      commentCount: 78,
      isAfterDark: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: generateId(),
      content: "3am confession: I've been leaving anonymous encouraging notes on people's cars in the parking lot for the past month. Your smiles when you find them make my whole week.",
      authorId: "sample6",
      authorAlias: "Velvet Storm",
      authorAvatarIndex: 7,
      authorKarma: 456,
      category: "after-dark",
      reactions: { fire: [], heart: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"], laugh: [], shock: [], sad: [] },
      commentCount: 42,
      isAfterDark: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    },
  ];

  const sampleMarketItems: MarketItem[] = [
    {
      id: generateId(),
      title: "Organic Chemistry Textbook (7th Ed)",
      description: "Barely used, highlighted a few pages. Cheaper than the bookstore.",
      price: 45,
      category: "textbooks",
      condition: "like-new",
      sellerId: "sample1",
      sellerAlias: "Midnight Owl",
      sellerKarma: 145,
      sellerAvatarIndex: 2,
      isSold: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: generateId(),
      title: "Mini Fridge - Perfect for Dorm",
      description: "Works perfectly, graduating and need to get rid of it fast. Pick up only.",
      price: 60,
      category: "dorm",
      condition: "good",
      sellerId: "sample3",
      sellerAlias: "Pixel Phantom",
      sellerKarma: 320,
      sellerAvatarIndex: 8,
      isSold: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: generateId(),
      title: "TI-84 Plus Calculator",
      description: "Still has all the programs loaded for Calc II. Battery included.",
      price: 35,
      category: "electronics",
      condition: "good",
      sellerId: "sample5",
      sellerAlias: "Arctic Flame",
      sellerKarma: 234,
      sellerAvatarIndex: 3,
      isSold: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
    {
      id: generateId(),
      title: "Concert Tickets - Campus Battle of Bands",
      description: "2 tickets for Friday's show. Can't make it anymore.",
      price: 15,
      category: "tickets",
      condition: "new",
      sellerId: "sample2",
      sellerAlias: "Neon Ghost",
      sellerKarma: 89,
      sellerAvatarIndex: 5,
      isSold: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    },
    {
      id: generateId(),
      title: "Essay Proofreading Service",
      description: "English major offering proofreading. 24hr turnaround. DM for details.",
      price: 10,
      category: "services",
      condition: "new",
      sellerId: "sample6",
      sellerAlias: "Velvet Storm",
      sellerKarma: 456,
      sellerAvatarIndex: 7,
      isSold: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
  ];

  await AsyncStorage.setItem(KEYS.CONFESSIONS, JSON.stringify(sampleConfessions));
  await AsyncStorage.setItem(KEYS.MARKETPLACE, JSON.stringify(sampleMarketItems));
}
