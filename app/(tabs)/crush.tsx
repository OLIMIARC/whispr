import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { SlideInUp, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import CrushCard from "@/components/CrushCard";

export default function CrushScreen() {
  const insets = useSafeAreaInsets();
  const { crushes, sendCrush, revealCrush, refreshData } = useApp();
  const [showSend, setShowSend] = useState(false);
  const [crushAlias, setCrushAlias] = useState("");
  const [crushMessage, setCrushMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleSend = async () => {
    if (!crushAlias.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await sendCrush(crushAlias.trim(), crushMessage.trim());
    setCrushAlias("");
    setCrushMessage("");
    setShowSend(false);
  };

  const mutualCount = crushes.filter((c) => c.isMutual && c.isRevealed).length;
  const pendingCount = crushes.filter((c) => !c.isRevealed).length;

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 }]}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Crush Corner</Text>
          <Text style={styles.subtitle}>Send anonymous signals</Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowSend(true); }}
          style={styles.sendButton}
        >
          <Ionicons name="heart" size={18} color={Colors.dark.text} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{crushes.length}</Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.dark.primary + "30" }]}>
          <Text style={[styles.statNumber, { color: Colors.dark.primary }]}>{mutualCount}</Text>
          <Text style={styles.statLabel}>Mutual</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.dark.secondary + "30" }]}>
          <Text style={[styles.statNumber, { color: Colors.dark.secondary }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {crushes.length > 0 && (
        <Text style={styles.sectionTitle}>Your Crushes</Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-half-outline" size={56} color={Colors.dark.primary + "60"} />
      </View>
      <Text style={styles.emptyTitle}>No crushes yet</Text>
      <Text style={styles.emptyText}>Send an anonymous crush signal to someone on campus. If they crush back, it's a match!</Text>
      <Pressable
        onPress={() => setShowSend(true)}
        style={styles.emptyButton}
      >
        <Ionicons name="heart" size={16} color={Colors.dark.text} />
        <Text style={styles.emptyButtonText}>Send Your First Crush</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={crushes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CrushCard crush={item} onReveal={revealCrush} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} colors={[Colors.dark.primary]} />
        }
      />

      <Modal visible={showSend} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSend(false)} />
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.sendSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
            <View style={styles.composeHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowSend(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>Send a Crush</Text>
              <Pressable
                onPress={handleSend}
                disabled={!crushAlias.trim()}
                style={[styles.sendCrushButton, !crushAlias.trim() && { opacity: 0.4 }]}
              >
                <Text style={styles.sendCrushButtonText}>Send</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Who's your crush?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter their alias (e.g., Shadow Fox)"
                placeholderTextColor={Colors.dark.textMuted}
                value={crushAlias}
                onChangeText={setCrushAlias}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Anonymous message (optional)</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="Leave them a hint..."
                placeholderTextColor={Colors.dark.textMuted}
                value={crushMessage}
                onChangeText={setCrushMessage}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{crushMessage.length}/200</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.dark.accent} />
              <Text style={styles.infoText}>Your identity stays hidden unless it's mutual</Text>
            </View>
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
  listContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.dark.text,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  statNumber: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.dark.text,
  },
  statLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.dark.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sendSheet: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  composeHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textMuted,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: Colors.dark.text,
  },
  sendCrushButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendCrushButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
    textAlign: "right",
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.accent + "10",
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.accent,
    flex: 1,
  },
});
