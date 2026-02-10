import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import {
  UserProfile,
  Confession,
  Crush,
  MarketItem,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  getConfessions,
  addConfession as addConfessionStorage,
  toggleReaction as toggleReactionStorage,
  getCrushes,
  sendCrush as sendCrushStorage,
  revealCrush as revealCrushStorage,
  getMarketItems,
  addMarketItem as addMarketItemStorage,
  toggleSold as toggleSoldStorage,
  isAfterDarkHours,
  seedSampleData,
} from "./storage";

interface AppContextValue {
  profile: UserProfile | null;
  confessions: Confession[];
  crushes: Crush[];
  marketItems: MarketItem[];
  isAfterDark: boolean;
  isLoading: boolean;
  addConfession: (data: Omit<Confession, "id" | "createdAt" | "reactions" | "commentCount">) => Promise<void>;
  toggleReaction: (confessionId: string, reactionType: keyof Confession["reactions"]) => Promise<void>;
  sendCrush: (toAlias: string, message: string) => Promise<void>;
  revealCrush: (crushId: string) => Promise<void>;
  addMarketItem: (data: Omit<MarketItem, "id" | "createdAt" | "isSold">) => Promise<void>;
  toggleSold: (itemId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  addKarma: (amount: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [crushes, setCrushes] = useState<Crush[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [isAfterDark, setIsAfterDark] = useState(isAfterDarkHours());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
    const interval = setInterval(() => {
      setIsAfterDark(isAfterDarkHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const initializeApp = async () => {
    try {
      let userProfile = await getUserProfile();
      if (!userProfile) {
        userProfile = await createUserProfile();
      }
      setProfile(userProfile);

      await seedSampleData(userProfile.id, userProfile.alias, userProfile.avatarIndex, userProfile.karma);

      const [loadedConfessions, loadedCrushes, loadedItems] = await Promise.all([
        getConfessions(),
        getCrushes(),
        getMarketItems(),
      ]);

      setConfessions(loadedConfessions);
      setCrushes(loadedCrushes);
      setMarketItems(loadedItems);
    } catch (error) {
      console.error("Failed to initialize:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    const [loadedConfessions, loadedCrushes, loadedItems] = await Promise.all([
      getConfessions(),
      getCrushes(),
      getMarketItems(),
    ]);
    setConfessions(loadedConfessions);
    setCrushes(loadedCrushes);
    setMarketItems(loadedItems);
  }, []);

  const addKarma = useCallback(async (amount: number) => {
    if (!profile) return;
    const updated = await updateUserProfile({ karma: profile.karma + amount });
    setProfile(updated);
  }, [profile]);

  const handleAddConfession = useCallback(async (data: Omit<Confession, "id" | "createdAt" | "reactions" | "commentCount">) => {
    await addConfessionStorage(data);
    if (profile) {
      const updated = await updateUserProfile({
        confessionsCount: profile.confessionsCount + 1,
        karma: profile.karma + 5,
      });
      setProfile(updated);
    }
    const loadedConfessions = await getConfessions();
    setConfessions(loadedConfessions);
  }, [profile]);

  const handleToggleReaction = useCallback(async (confessionId: string, reactionType: keyof Confession["reactions"]) => {
    if (!profile) return;
    const updated = await toggleReactionStorage(confessionId, profile.id, reactionType);
    setConfessions(updated);
    await addKarma(1);
  }, [profile, addKarma]);

  const handleSendCrush = useCallback(async (toAlias: string, message: string) => {
    if (!profile) return;
    await sendCrushStorage({ fromUserId: profile.id, toAlias, message });
    const updated = await updateUserProfile({
      crushesSent: profile.crushesSent + 1,
      karma: profile.karma + 3,
    });
    setProfile(updated);
    const loadedCrushes = await getCrushes();
    setCrushes(loadedCrushes);
  }, [profile]);

  const handleRevealCrush = useCallback(async (crushId: string) => {
    const updated = await revealCrushStorage(crushId);
    setCrushes(updated);
    if (profile) {
      const updatedProfile = await updateUserProfile({
        matchesRevealed: profile.matchesRevealed + 1,
      });
      setProfile(updatedProfile);
    }
  }, [profile]);

  const handleAddMarketItem = useCallback(async (data: Omit<MarketItem, "id" | "createdAt" | "isSold">) => {
    await addMarketItemStorage(data);
    if (profile) {
      const updated = await updateUserProfile({ karma: profile.karma + 3 });
      setProfile(updated);
    }
    const items = await getMarketItems();
    setMarketItems(items);
  }, [profile]);

  const handleToggleSold = useCallback(async (itemId: string) => {
    const updated = await toggleSoldStorage(itemId);
    setMarketItems(updated);
  }, []);

  const value = useMemo(() => ({
    profile,
    confessions,
    crushes,
    marketItems,
    isAfterDark,
    isLoading,
    addConfession: handleAddConfession,
    toggleReaction: handleToggleReaction,
    sendCrush: handleSendCrush,
    revealCrush: handleRevealCrush,
    addMarketItem: handleAddMarketItem,
    toggleSold: handleToggleSold,
    refreshData,
    addKarma,
  }), [profile, confessions, crushes, marketItems, isAfterDark, isLoading,
    handleAddConfession, handleToggleReaction, handleSendCrush, handleRevealCrush,
    handleAddMarketItem, handleToggleSold, refreshData, addKarma]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
