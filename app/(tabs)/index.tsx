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
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
// import { getApiUrl } from "@/lib/api-config"; // Unused now
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";
import ConfessionCard from "@/components/ConfessionCard";
import MediaPicker, { type SelectedMedia } from "@/components/MediaPicker";
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
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

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

  const uploadMedia = async (media: SelectedMedia): Promise<{ url: string; thumbnail?: string } | null> => {
    try {
      const ext = media.uri.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Convert URI to Blob
      const response = await fetch(media.uri);
      const blob = await response.blob();

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from("whispr-media")
        .upload(path, blob, {
          contentType: media.type === "video" ? "video/mp4" : "image/jpeg",
        });

      if (error) throw error;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("whispr-media")
        .getPublicUrl(path);

      return {
        url: publicUrl,
        thumbnail: media.type === "image" ? publicUrl : undefined
      };
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Could not upload media. Please try again.");
      return null;
    }
  };

  const handlePost = async () => {
    if (!composeText.trim() || !profile || isPosting) return;
    setIsPosting(true);
    try {
      let mediaUrl: string | undefined;
      let mediaThumbnail: string | undefined;
      let mediaType: "image" | "video" | undefined;

      // Upload media if selected
      if (selectedMedia) {
        const uploaded = await uploadMedia(selectedMedia);
        if (!uploaded) {
          setIsPosting(false);
          return;
        }
        mediaUrl = uploaded.url;
        mediaThumbnail = uploaded.thumbnail;
        mediaType = selectedMedia.type;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addConfession({
        content: composeText.trim(),
        authorId: profile.id,
        authorAlias: profile.alias,
        authorAvatarIndex: profile.avatarIndex,
        authorKarma: profile.karma,
        category: composeCategory,
        isAfterDark: composeCategory === "after-dark",
        mediaUrl,
        mediaType,
        mediaThumbnail,
      } as any);
      setComposeText("");
      setSelectedMedia(null);
      setShowCompose(false);
    } finally {
      setIsPosting(false);
    }
  };

  const handleCloseCompose = () => {
    setComposeText("");
    setComposeCategory("confession");
    setSelectedMedia(null);
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
            userAlias={profile?.alias || "Anonymous"}
            userAvatar={profile?.avatarIndex || 0}
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
          <Pressable style={styles.modalBackdrop} onPress={handleCloseCompose} />
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.composeSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
            <View style={styles.composeHandle} />
            <View style={styles.composeHeader}>
              <Pressable onPress={handleCloseCompose} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
              </Pressable>
              <Text style={styles.composeTitle}>New Post</Text>
              <Pressable
                onPress={handlePost}
                disabled={(!composeText.trim() && !selectedMedia) || isPosting}
                style={({ pressed }) => [
                  styles.postButton,
                  ((!composeText.trim() && !selectedMedia) || isPosting) && { opacity: 0.4 },
                  pressed && !((!composeText.trim() && !selectedMedia) || isPosting) && { opacity: 0.8 }
                ]}
              >
                {isPosting ? (
                  <Text style={styles.postButtonText}>Posting...</Text>
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              style={styles.composeContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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

              {/* Input Area */}
              <View style={styles.inputContainer}>
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
              </View>

              {/* Media Preview Below Input */}
              {selectedMedia && (
                <View style={[
                  styles.mediaPreviewBlock,
                  {
                    marginTop: 12,
                    marginBottom: 0,
                    // If we have dimensions, calculate aspect ratio, otherwise default to 16/9
                    aspectRatio: (selectedMedia.width && selectedMedia.height)
                      ? selectedMedia.width / selectedMedia.height
                      : 16 / 9
                  }
                ]}>
                  {selectedMedia.type === "image" ? (
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.previewImage}
                      resizeMode="cover" // Cover is fine if we set the container aspect ratio to match the image
                    />
                  ) : (
                    <Video
                      source={{ uri: selectedMedia.uri }}
                      style={styles.previewVideo}
                      shouldPlay
                      isLooping
                      isMuted
                      resizeMode={ResizeMode.COVER}
                    />
                  )}
                  <Pressable
                    style={styles.removeMediaButton}
                    onPress={() => setSelectedMedia(null)}
                  >
                    <Ionicons name="close-circle" size={28} color="#FF5252" />
                  </Pressable>
                </View>
              )}

              {/* Media Picker / Toolbar */}
              <View style={styles.toolbarContainer}>
                {!selectedMedia && (
                  <MediaPicker
                    selectedMedia={selectedMedia}
                    onMediaSelected={setSelectedMedia}
                    allowVideo={true}
                    maxVideoDuration={30}
                    variant="icon"
                  />
                )}
              </View>

              <Text style={[
                styles.charCount,
                composeText.length >= 490 && { color: "#FF5252" },
                composeText.length >= 450 && composeText.length < 490 && { color: "#FFA726" },
              ]}>
                {composeText.length}/500
              </Text>
            </ScrollView>
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
    height: "85%",
  },
  composeContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  inputContainer: {
    flex: 1,
    position: "relative",
  },
  composeInputWithMedia: {
    minHeight: 100,
  },
  mediaPreviewBlock: {
    width: "100%",
    // height: 200, <-- Removed fixed height to allow aspectRatio to control it
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#000",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  toolbarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
    paddingTop: 12,
  },
  previewVideo: {
    width: "100%",
    height: "100%",
  },
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 14,
  },
  mediaIconButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    padding: 8,
    borderRadius: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: "right",
    marginTop: 8,
  },
});
