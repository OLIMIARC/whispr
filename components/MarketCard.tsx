import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import Avatar from "./Avatar";
import KarmaBadge from "./KarmaBadge";
import { MarketItem, getTimeSince } from "@/lib/storage";
import CommentSection from "./CommentSection";

const CATEGORY_ICONS: Record<MarketItem["category"], keyof typeof Ionicons.glyphMap> = {
  textbooks: "book-outline",
  electronics: "laptop-outline",
  dorm: "bed-outline",
  clothing: "shirt-outline",
  services: "construct-outline",
  tickets: "ticket-outline",
  other: "cube-outline",
};

const CONDITION_COLORS: Record<MarketItem["condition"], string> = {
  new: Colors.dark.green,
  "like-new": Colors.dark.accent,
  good: Colors.dark.gold,
  fair: Colors.dark.textSecondary,
};

interface MarketCardProps {
  item: MarketItem;
  onToggleSold?: (id: string) => void;
  onDelete?: (id: string) => void;
  isOwner?: boolean;
}

export default function MarketCard({ item, onToggleSold, onDelete, isOwner }: MarketCardProps) {
  const [showComments, setShowComments] = useState(false);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleSold?.(item.id);
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      onDelete?.(item.id);
      return;
    }
    Alert.alert("Delete Listing", "Remove this item from the marketplace?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete?.(item.id) },
    ]);
  };

  return (
    <View style={[styles.card, item.isSold && styles.soldCard]}>
      <View style={styles.topRow}>
        <View style={[styles.categoryIcon, { backgroundColor: Colors.dark.secondary + "20" }]}>
          <Ionicons name={CATEGORY_ICONS[item.category]} size={22} color={Colors.dark.secondary} />
        </View>
        <View style={styles.topRight}>
          {isOwner && onDelete && (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={Colors.dark.textMuted} />
            </Pressable>
          )}
          <View style={styles.priceContainer}>
            <Text style={styles.priceSign}>$</Text>
            <Text style={styles.price}>{item.price.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.title, item.isSold && styles.soldText]}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      {item.imageUrls && item.imageUrls.length > 0 && (
        <View style={styles.imageContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.imageUrls.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={[styles.marketImage, index > 0 && { marginLeft: 10 }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      )}



      <View style={styles.metaRow}>
        <View style={[styles.conditionBadge, { borderColor: CONDITION_COLORS[item.condition] + "40" }]}>
          <Text style={[styles.conditionText, { color: CONDITION_COLORS[item.condition] }]}>
            {item.condition === "like-new" ? "Like New" : item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
          </Text>
        </View>
        <Text style={styles.timeText}>{getTimeSince(item.createdAt)}</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          style={styles.commentButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowComments(!showComments);
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={Colors.dark.textSecondary} />
          {/* We might want to add comment count to MarketItem later */}
          <Text style={styles.commentButtonText}>Q&A</Text>
        </Pressable>
      </View>

      <View style={styles.sellerRow}>
        <Avatar index={item.sellerAvatarIndex} size={24} />
        <Text style={styles.sellerAlias}>{item.sellerAlias}</Text>
        <KarmaBadge karma={item.sellerKarma} />
        {isOwner && (
          <Pressable onPress={handleToggle} style={[styles.soldButton, item.isSold && styles.soldButtonActive]}>
            <Ionicons name={item.isSold ? "checkmark-circle" : "ellipse-outline"} size={14} color={item.isSold ? Colors.dark.green : Colors.dark.textMuted} />
            <Text style={[styles.soldButtonText, item.isSold && { color: Colors.dark.green }]}>
              {item.isSold ? "Sold" : "Mark Sold"}
            </Text>
          </Pressable>
        )}
      </View>

      {item.isSold && (
        <View style={styles.soldOverlay}>
          <Text style={styles.soldLabel}>SOLD</Text>
        </View>
      )}

      {showComments && (
        <CommentSection
          parentId={item.id}
          parentType="market"
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
    position: "relative",
    overflow: "hidden",
  },
  soldCard: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  priceSign: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.green,
    marginTop: 2,
  },
  price: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    color: Colors.dark.green,
  },
  title: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  soldText: {
    textDecorationLine: "line-through",
  },
  description: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  imageContainer: {
    marginBottom: 12,
  },
  marketImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  conditionText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
  },
  timeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  commentButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
  },
  sellerAlias: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  soldButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  soldButtonActive: {
    backgroundColor: Colors.dark.green + "15",
  },
  soldButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  soldOverlay: {
    position: "absolute",
    top: 12,
    right: -28,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 30,
    paddingVertical: 4,
    transform: [{ rotate: "45deg" }],
  },
  soldLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.dark.text,
    letterSpacing: 1,
  },
});
