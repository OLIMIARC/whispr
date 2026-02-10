import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getKarmaLevel } from "@/lib/storage";

interface KarmaBadgeProps {
  karma: number;
  size?: "small" | "medium" | "large";
}

export default function KarmaBadge({ karma, size = "small" }: KarmaBadgeProps) {
  const level = getKarmaLevel(karma);
  const color = Colors.dark.karma[level];
  const fontSize = size === "large" ? 16 : size === "medium" ? 13 : 11;
  const iconSize = size === "large" ? 14 : size === "medium" ? 12 : 10;
  const paddingH = size === "large" ? 10 : size === "medium" ? 8 : 6;
  const paddingV = size === "large" ? 4 : size === "medium" ? 3 : 2;

  return (
    <View style={[styles.container, { borderColor: color + "40", paddingHorizontal: paddingH, paddingVertical: paddingV }]}>
      <Ionicons name="sparkles" size={iconSize} color={color} />
      <Text style={[styles.text, { color, fontSize }]}>{karma}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontFamily: "Outfit_600SemiBold",
  },
});
