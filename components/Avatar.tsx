import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const AVATAR_COLORS = [
  "#FF4D6A", "#6C5CE7", "#00D2FF", "#FFB800",
  "#00E676", "#FF6B35", "#E040FB", "#00BCD4",
  "#FF5252", "#7C4DFF", "#64FFDA", "#FFAB40",
];

const AVATAR_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "skull-outline", "planet-outline", "flame-outline", "diamond-outline",
  "flash-outline", "moon-outline", "eye-outline", "leaf-outline",
  "rocket-outline", "paw-outline", "thunderstorm-outline", "star-outline",
];

interface AvatarProps {
  index: number;
  size?: number;
}

export default function Avatar({ index, size = 40 }: AvatarProps) {
  const safeIndex = Math.abs(index) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[safeIndex];
  const icon = AVATAR_ICONS[safeIndex];

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + "20" }]}>
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
