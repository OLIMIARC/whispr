import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import Avatar from "./Avatar";
import KarmaBadge from "./KarmaBadge";
import CommentSection from "./CommentSection";
import { Confession, getTimeSince } from "@/lib/storage";

const CATEGORY_LABELS: Record<Confession["category"], { label: string; color: string }> = {
  confession: { label: "Confession", color: Colors.dark.primary },
  "hot-take": { label: "Hot Take", color: Colors.dark.reaction.fire },
  rant: { label: "Rant", color: "#FF5252" },
  wholesome: { label: "Wholesome", color: Colors.dark.green },
  "after-dark": { label: "After Dark", color: Colors.dark.secondary },
};

const REACTION_CONFIG: Array<{ key: keyof Confession["reactions"]; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { key: "fire", icon: "flame-outline", activeIcon: "flame", color: Colors.dark.reaction.fire },
  { key: "heart", icon: "heart-outline", activeIcon: "heart", color: Colors.dark.reaction.heart },
  { key: "laugh", icon: "happy-outline", activeIcon: "happy", color: Colors.dark.reaction.laugh },
  { key: "shock", icon: "alert-circle-outline", activeIcon: "alert-circle", color: Colors.dark.reaction.shock },
  { key: "sad", icon: "sad-outline", activeIcon: "sad", color: Colors.dark.reaction.sad },
];

interface ConfessionCardProps {
  confession: Confession;
  userId: string;
  userAlias: string;
  userAvatar: number;
  onReaction: (confessionId: string, type: keyof Confession["reactions"]) => void;
  onDelete?: (confessionId: string) => void;
  isAfterDark: boolean;
}

export default function ConfessionCard({ confession, userId, userAlias, userAvatar, onReaction, onDelete, isAfterDark }: ConfessionCardProps) {
  const categoryConfig = CATEGORY_LABELS[confession.category];
  const isOwner = confession.authorId === userId;
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleReaction = (type: keyof Confession["reactions"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction(confession.id, type);
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      onDelete?.(confession.id);
      return;
    }
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete?.(confession.id) },
    ]);
  };

  return (
    <View style={[styles.card, isAfterDark && confession.isAfterDark && styles.afterDarkCard]}>
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <Avatar index={confession.authorAvatarIndex} size={36} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorAlias}>{confession.authorAlias}</Text>
            <View style={styles.metaRow}>
              <KarmaBadge karma={confession.authorKarma} />
              <Text style={styles.dot}>  </Text>
              <Text style={styles.timeText}>{getTimeSince(confession.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isOwner && onDelete && (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={Colors.dark.textMuted} />
            </Pressable>
          )}
          <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + "20" }]}>
            <Text style={[styles.categoryText, { color: categoryConfig.color }]}>{categoryConfig.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.content}>{confession.content}</Text>

      {/* Media Display */}
      {confession.mediaUrl && confession.mediaType === "image" && (
        <Pressable onPress={() => {
          // Future: open full screen image viewer
        }}>
          <Image
            source={{ uri: confession.mediaUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </Pressable>
      )}

      {confession.mediaUrl && confession.mediaType === "video" && (
        <View style={styles.videoPlaceholder}>
          {isPlaying ? (
            <Video
              source={{ uri: confession.mediaUrl }}
              style={styles.mediaImage}
              useNativeControls
              resizeMode={ResizeMode.COVER}
              shouldPlay={true}
              isLooping
            />
          ) : (
            <Pressable onPress={() => setIsPlaying(true)} style={styles.videoContainer}>
              <Image
                source={{ uri: confession.mediaThumbnail || confession.mediaUrl }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={64} color="rgba(255, 255, 255, 0.9)" />
              </View>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.actionsRow}>
        <View style={styles.reactionsRow}>
          {REACTION_CONFIG.map((reaction) => {
            const count = confession.reactions[reaction.key].length;
            const isActive = confession.reactions[reaction.key].includes(userId);
            return (
              <Pressable
                key={reaction.key}
                onPress={() => handleReaction(reaction.key)}
                style={[styles.reactionButton, isActive && { backgroundColor: reaction.color + "20" }]}
              >
                <Ionicons
                  name={isActive ? reaction.activeIcon : reaction.icon}
                  size={18}
                  color={isActive ? reaction.color : Colors.dark.textMuted}
                />
                {count > 0 && (
                  <Text style={[styles.reactionCount, isActive && { color: reaction.color }]}>{count}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Comment Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowComments(!showComments);
          }}
          style={[styles.commentButton, showComments && styles.commentButtonActive]}
        >
          <Ionicons
            name={showComments ? "chatbubble" : "chatbubble-outline"}
            size={18}
            color={showComments ? Colors.dark.primary : Colors.dark.textMuted}
          />
          {confession.commentCount > 0 && (
            <Text style={[styles.commentCount, showComments && { color: Colors.dark.primary }]}>
              {confession.commentCount}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Comment Section */}
      {showComments && (
        <CommentSection
          parentId={confession.id}
          parentType="confession"
          isVisible={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  afterDarkCard: {
    borderColor: Colors.dark.secondary + "40",
    backgroundColor: Colors.dark.card + "EE",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorInfo: {
    flex: 1,
  },
  authorAlias: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    color: Colors.dark.textMuted,
    fontSize: 8,
  },
  timeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
  },
  content: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 14,
  },
  reactionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
  },
  reactionCount: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  mediaImage: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: Colors.dark.surface,
  },
  videoPlaceholder: {
    position: "relative",
    marginBottom: 12,
  },
  videoContainer: {
    position: "relative",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
  },
  commentButtonActive: {
    backgroundColor: Colors.dark.primary + "20",
  },
  commentCount: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
});
