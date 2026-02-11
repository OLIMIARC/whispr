import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import {
  UserProfile,
  Confession,
  Crush,
  MarketItem,
  Comment,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  regenerateAlias,
  getConfessions,
  addConfession as addConfessionStorage,
  deleteConfession as deleteConfessionStorage,
  toggleReaction as toggleReactionStorage,
  getCrushes,
  sendCrush as sendCrushStorage,
  deleteCrush as deleteCrushStorage,
  revealCrush as revealCrushStorage,
  getMarketItems,
  addMarketItem as addMarketItemStorage,
  deleteMarketItem as deleteMarketItemStorage,
  toggleSold as toggleSoldStorage,
  getComments,
  addComment as addCommentStorage,
  deleteComment as deleteCommentStorage,
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
  addConfession: (data: Omit<Confession, "id" | "createdAt" | "reactions" | "commentCount">) => Promise<boolean>;
  deleteConfession: (confessionId: string) => Promise<void>;
  toggleReaction: (confessionId: string, reactionType: keyof Confession["reactions"]) => Promise<void>;
  sendCrush: (toAlias: string, message: string) => Promise<boolean>;
  deleteCrush: (crushId: string) => Promise<void>;
  revealCrush: (crushId: string) => Promise<void>;
  addMarketItem: (data: Omit<MarketItem, "id" | "createdAt" | "isSold">) => Promise<boolean>;
  deleteMarketItem: (itemId: string) => Promise<void>;
  toggleSold: (itemId: string) => Promise<void>;
  addComment: (data: Omit<Comment, "id" | "createdAt" | "likes">) => Promise<Comment | null>;
  deleteComment: (commentId: string, parentId: string, parentType: "confession" | "market") => Promise<void>;
  refreshData: () => Promise<void>;
  regenerateProfile: () => Promise<void>;
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

      await seedSampleData();

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
    const [loadedConfessions, loadedCrushes, loadedItems, freshProfile] = await Promise.all([
      getConfessions(),
      getCrushes(),
      getMarketItems(),
      getUserProfile(),
    ]);
    setConfessions(loadedConfessions);
    setCrushes(loadedCrushes);
    setMarketItems(loadedItems);
    if (freshProfile) setProfile(freshProfile);
  }, []);

  const handleAddConfession = useCallback(async (data: Omit<Confession, "id" | "createdAt" | "reactions" | "commentCount">) => {
    const result = await addConfessionStorage(data);
    if (!result) return false;
    const freshProfile = await getUserProfile();
    if (freshProfile) {
      const updated = await updateUserProfile({
        confessionsCount: freshProfile.confessionsCount + 1,
        karma: freshProfile.karma + 5,
      });
      setProfile(updated);
    }
    const loadedConfessions = await getConfessions();
    setConfessions(loadedConfessions);
    return true;
  }, []);

  const handleDeleteConfession = useCallback(async (confessionId: string) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return;
    const updated = await deleteConfessionStorage(confessionId, freshProfile.id);
    setConfessions(updated);
  }, []);

  const handleToggleReaction = useCallback(async (confessionId: string, reactionType: keyof Confession["reactions"]) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return;
    const { confessions: updated, added } = await toggleReactionStorage(confessionId, freshProfile.id, reactionType);
    setConfessions(updated);
    if (added) {
      const latestProfile = await getUserProfile();
      if (latestProfile) {
        const updatedProfile = await updateUserProfile({
          reactionsGiven: latestProfile.reactionsGiven + 1,
          karma: latestProfile.karma + 1,
        });
        setProfile(updatedProfile);
      }
    }
  }, []);

  const handleSendCrush = useCallback(async (toAlias: string, message: string) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return false;
    const result = await sendCrushStorage({ fromUserId: freshProfile.id, toAlias, message });
    if (!result) return false;
    const updated = await updateUserProfile({
      crushesSent: freshProfile.crushesSent + 1,
      karma: freshProfile.karma + 3,
    });
    setProfile(updated);
    const loadedCrushes = await getCrushes();
    setCrushes(loadedCrushes);
    return true;
  }, []);

  const handleDeleteCrush = useCallback(async (crushId: string) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return;
    const updated = await deleteCrushStorage(crushId, freshProfile.id);
    setCrushes(updated);
  }, []);

  const handleRevealCrush = useCallback(async (crushId: string) => {
    const updated = await revealCrushStorage(crushId);
    setCrushes(updated);
    const freshProfile = await getUserProfile();
    if (freshProfile) {
      const updatedProfile = await updateUserProfile({
        matchesRevealed: freshProfile.matchesRevealed + 1,
      });
      setProfile(updatedProfile);
    }
  }, []);

  const handleAddMarketItem = useCallback(async (data: Omit<MarketItem, "id" | "createdAt" | "isSold">) => {
    const result = await addMarketItemStorage(data);
    if (!result) return false;
    const freshProfile = await getUserProfile();
    if (freshProfile) {
      const updated = await updateUserProfile({ karma: freshProfile.karma + 3 });
      setProfile(updated);
    }
    const items = await getMarketItems();
    setMarketItems(items);
    return true;
  }, []);

  const handleDeleteMarketItem = useCallback(async (itemId: string) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return;
    const updated = await deleteMarketItemStorage(itemId, freshProfile.id);
    setMarketItems(updated);
  }, []);

  const handleToggleSold = useCallback(async (itemId: string) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return;
    const updated = await toggleSoldStorage(itemId, freshProfile.id);
    setMarketItems(updated);
  }, []);

  const handleRegenerateProfile = useCallback(async () => {
    const updated = await regenerateAlias();
    setProfile(updated);
  }, []);

  const handleAddComment = useCallback(async (data: Omit<Comment, "id" | "createdAt" | "likes">) => {
    const freshProfile = await getUserProfile();
    if (!freshProfile) return null;

    // Ensure the comment has the current user's details
    const commentData = {
      ...data,
      authorId: freshProfile.id,
      authorAlias: freshProfile.alias,
      authorAvatarIndex: freshProfile.avatarIndex,
      authorKarma: freshProfile.karma,
    };

    const newComment = await addCommentStorage(commentData);
    if (!newComment) return null;

    // Update karma
    const updatedProfile = await updateUserProfile({ karma: freshProfile.karma + 1 });
    setProfile(updatedProfile);

    // Update parent's comment count in state if it's a confession
    if (data.parentType === "confession") {
      setConfessions(prev => prev.map(c =>
        c.id === data.parentId
          ? { ...c, commentCount: c.commentCount + 1 }
          : c
      ));
    }

    return newComment;
  }, []);

  const handleDeleteComment = useCallback(async (commentId: string, parentId: string, parentType: "confession" | "market") => {
    await deleteCommentStorage(commentId, parentId, parentType);

    // Update parent's comment count in state if it's a confession
    if (parentType === "confession") {
      setConfessions(prev => prev.map(c =>
        c.id === parentId
          ? { ...c, commentCount: Math.max(0, c.commentCount - 1) }
          : c
      ));
    }
  }, []);

  const value = useMemo(() => ({
    profile,
    confessions,
    crushes,
    marketItems,
    isAfterDark,
    isLoading,
    addConfession: handleAddConfession,
    deleteConfession: handleDeleteConfession,
    toggleReaction: handleToggleReaction,
    sendCrush: handleSendCrush,
    deleteCrush: handleDeleteCrush,
    revealCrush: handleRevealCrush,
    addMarketItem: handleAddMarketItem,
    deleteMarketItem: handleDeleteMarketItem,
    toggleSold: handleToggleSold,
    addComment: handleAddComment,
    deleteComment: handleDeleteComment,
    refreshData,
    regenerateProfile: handleRegenerateProfile,
  }), [profile, confessions, crushes, marketItems, isAfterDark, isLoading,
    handleAddConfession, handleDeleteConfession, handleToggleReaction,
    handleSendCrush, handleDeleteCrush, handleRevealCrush,
    handleAddMarketItem, handleDeleteMarketItem, handleToggleSold,
    handleAddComment, handleDeleteComment,
    refreshData, handleRegenerateProfile]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
