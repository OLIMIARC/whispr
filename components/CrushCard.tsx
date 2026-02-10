import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withSequence } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { Crush, getTimeSince } from "@/lib/storage";

interface CrushCardProps {
  crush: Crush;
  onReveal: (id: string) => void;
}

export default function CrushCard({ crush, onReveal }: CrushCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleReveal = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(
      withSpring(1.05),
      withSpring(1)
    );
    onReveal(crush.id);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[styles.card, crush.isMutual && crush.isRevealed && styles.mutualCard]}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={crush.isRevealed ? (crush.isMutual ? "heart" : "heart-dislike") : "heart-half"}
              size={24}
              color={crush.isMutual && crush.isRevealed ? Colors.dark.primary : crush.isRevealed ? Colors.dark.textMuted : Colors.dark.secondary}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.toAlias}>Crush on: {crush.toAlias}</Text>
            <Text style={styles.timeText}>{getTimeSince(crush.createdAt)}</Text>
          </View>
          {crush.isMutual && crush.isRevealed && (
            <View style={styles.mutualBadge}>
              <Ionicons name="sparkles" size={12} color={Colors.dark.gold} />
              <Text style={styles.mutualText}>Mutual</Text>
            </View>
          )}
        </View>

        {crush.message ? (
          <Text style={styles.message}>{crush.message}</Text>
        ) : null}

        {!crush.isRevealed && (
          <Pressable onPress={handleReveal} style={({ pressed }) => [styles.revealButton, pressed && { opacity: 0.8 }]}>
            <Ionicons name="eye-outline" size={16} color={Colors.dark.text} />
            <Text style={styles.revealText}>Reveal Match Status</Text>
          </Pressable>
        )}

        {crush.isRevealed && !crush.isMutual && (
          <View style={styles.statusRow}>
            <Ionicons name="time-outline" size={14} color={Colors.dark.textMuted} />
            <Text style={styles.statusText}>Not mutual yet... keep hoping!</Text>
          </View>
        )}

        {crush.isRevealed && crush.isMutual && (
          <View style={[styles.statusRow, { backgroundColor: Colors.dark.primary + "15" }]}>
            <Ionicons name="heart" size={14} color={Colors.dark.primary} />
            <Text style={[styles.statusText, { color: Colors.dark.primary }]}>It's a match! Both of you crushed on each other</Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
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
  mutualCard: {
    borderColor: Colors.dark.primary + "40",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  toAlias: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.dark.text,
  },
  timeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  mutualBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.gold + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mutualText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.dark.gold,
  },
  message: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
    marginLeft: 56,
  },
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.secondary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  revealText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    marginTop: 4,
  },
  statusText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textMuted,
    flex: 1,
  },
});
