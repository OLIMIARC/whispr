import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import ConfessionCard from "@/components/ConfessionCard";
import type { Confession } from "@/lib/storage";

type SortMode = "trending" | "recent";
type FilterCategory = "all" | Confession["category"];

const CATEGORY_FILTERS: Array<{ key: FilterCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "confession", label: "Confessions" },
  { key: "hot-take", label: "Hot Takes" },
  { key: "wholesome", label: "Wholesome" },
  { key: "after-dark", label: "After Dark" },
  { key: "rant", label: "Rants" },
];

const POST_CATEGORIES: Array<{ key: Confession["category"]; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "confession", label: "Confession", icon: "chatbubble-ellipses-outline" },
  { key: "hot-take", label: "Hot Take", icon: "flame-outline" },
  { key: "wholesome", label: "Wholesome", icon: "heart-outline" },
  { key: "rant", label: "Rant", icon: "megaphone-outline" },
  { key: "after-dark", label: "After Dark", icon: "moon-outline" },
];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { profile, confessions, isAfterDark, toggleReaction, addConfession, deleteConfession, refreshData } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>("trending");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeCategory, setComposeCategory] = useState<Confession["category"]>("confession");
  const [refreshing, setRefreshing] = useState(false);

  const sortedConfessions = useMemo(() => {
    let filtered = filterCategory === "all"
      ? confessions
      : confessions.filter((c) => c.category === filterCategory);

    if (sortMode === "trending") {
      return [...filtered].sort((a, b) => {
        const aTotal = Object.values(a.reactions).reduce((s, arr) => s + arr.length, 0);
        const bTotal = Object.values(b.reactions).reduce((s, arr) => s + arr.length, 0);
        return bTotal - aTotal;
      });
    }
    return filtered;
  }, [confessions, sortMode, filterCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handlePost = async () => {
    if (!composeText.trim() || !profile) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addConfession({
      content: composeText.trim(),
      authorId: profile.id,
      authorAlias: profile.alias,
      authorAvatarIndex: profile.avatarIndex,
      authorKarma: profile.karma,
      category: composeCategory,
      isAfterDark: composeCategory === "after-dark",
    });
    setComposeText("");
    setShowCompose(false);
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderHeader = () => (
    <View>
      <View style={[styles.headerBar, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.appTitle}>Whispr</Text>
            {isAfterDark && (
              <View style={styles.afterDarkBanner}>
                <Ionicons name="moon" size={12} color={Colors.dark.secondary} />
                <Text style={styles.afterDarkText}>After Dark Mode</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowCompose(true);
            }}
            style={styles.composeButton}
          >
            <Ionicons name="add" size={22} color={Colors.dark.text} />
          </Pressable>
        </View>

        <View style={styles.sortRow}>
          <Pressable
            onPress={() => { setSortMode("trending"); Haptics.selectionAsync(); }}
            style={[styles.sortButton, sortMode === "trending" && styles.sortButtonActive]}
          >
            <Ionicons name="trending-up" size={16} color={sortMode === "trending" ? Colors.dark.text : Colors.dark.textMuted} />
            <Text style={[styles.sortText, sortMode === "trending" && styles.sortTextActive]}>Trending</Text>
          </Pressable>
          <Pressable
            onPress={() => { setSortMode("recent"); Haptics.selectionAsync(); }}
            style={[styles.sortButton, sortMode === "recent" && styles.sortButtonActive]}
          >
            <Ionicons name="time-outline" size={16} color={sortMode === "recent" ? Colors.dark.text : Colors.dark.textMuted} />
            <Text style={[styles.sortText, sortMode === "recent" && styles.sortTextActive]}>Recent</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORY_FILTERS}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { setFilterCategory(item.key); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filterCategory === item.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filterCategory === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color={Colors.dark.textMuted} />
      <Text style={styles.emptyTitle}>No confessions yet</Text>
      <Text style={styles.emptyText}>Be the first to share something</Text>
    </View>
  );

  return (
    <View style={[styles.container, isAfterDark && styles.afterDarkContainer]}>
      <FlatList
        data={sortedConfessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConfessionCard
            confession={item}
            userId={profile?.id || ""}
            onReaction={toggleReaction}
            onDelete={deleteConfession}
            isAfterDark={isAfterDark}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
            colors={[Colors.dark.primary]}
          />
        }
      />

      <Modal visible={showCompose} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCompose(false)} />
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.composeSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
            <View style={styles.composeHandle} />
            <View style={styles.composeHeader}>
              <Pressable onPress={() => setShowCompose(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
              </Pressable>
              <Text style={styles.composeTitle}>New Post</Text>
              <Pressable
                onPress={handlePost}
                disabled={!composeText.trim()}
                style={[styles.postButton, !composeText.trim() && { opacity: 0.4 }]}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </Pressable>
            </View>

            <FlatList
              horizontal
              data={POST_CATEGORIES}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.composeCategoryList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setComposeCategory(item.key); Haptics.selectionAsync(); }}
                  style={[styles.composeCategoryChip, composeCategory === item.key && styles.composeCategoryChipActive]}
                >
                  <Ionicons name={item.icon} size={14} color={composeCategory === item.key ? Colors.dark.text : Colors.dark.textMuted} />
                  <Text style={[styles.composeCategoryText, composeCategory === item.key && styles.composeCategoryTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />

            <TextInput
              style={styles.composeInput}
              placeholder="What's on your mind? It's anonymous..."
              placeholderTextColor={Colors.dark.textMuted}
              multiline
              value={composeText}
              onChangeText={setComposeText}
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{composeText.length}/500</Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  afterDarkContainer: {
    backgroundColor: "#060610",
  },
  listContent: {
    flexGrow: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  appTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
  },
  afterDarkBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  afterDarkText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.dark.secondary,
  },
  composeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
  },
  sortButtonActive: {
    backgroundColor: Colors.dark.cardElevated,
  },
  sortText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  sortTextActive: {
    color: Colors.dark.text,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primary + "20",
    borderColor: Colors.dark.primary + "50",
  },
  filterText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  filterTextActive: {
    color: Colors.dark.primary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  composeSheet: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "80%",
  },
  composeHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textMuted,
    alignSelf: "center",
    marginBottom: 16,
  },
  composeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  composeTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: Colors.dark.text,
  },
  postButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  composeCategoryList: {
    gap: 8,
    marginBottom: 16,
  },
  composeCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
  },
  composeCategoryChipActive: {
    backgroundColor: Colors.dark.primary + "20",
  },
  composeCategoryText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  composeCategoryTextActive: {
    color: Colors.dark.text,
  },
  composeInput: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: Colors.dark.text,
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 0,
  },
  charCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: "right",
    marginTop: 8,
  },
});
