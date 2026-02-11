import React, { useState, useCallback, useMemo } from "react";
import MediaPicker, { type SelectedMedia } from "../../components/MediaPicker";
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
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { SlideInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/app-context";
import MarketCard from "@/components/MarketCard";
import type { MarketItem } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
// import { getApiUrl } from "@/lib/api-config"; // Unused now

type MarketCategory = "all" | MarketItem["category"];

const CATEGORIES: Array<{ key: MarketCategory; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "all", label: "All", icon: "grid-outline" },
  { key: "textbooks", label: "Books", icon: "book-outline" },
  { key: "electronics", label: "Tech", icon: "laptop-outline" },
  { key: "dorm", label: "Dorm", icon: "bed-outline" },
  { key: "clothing", label: "Clothes", icon: "shirt-outline" },
  { key: "services", label: "Services", icon: "construct-outline" },
  { key: "tickets", label: "Tickets", icon: "ticket-outline" },
];

const CONDITIONS: Array<{ key: MarketItem["condition"]; label: string }> = [
  { key: "new", label: "New" },
  { key: "like-new", label: "Like New" },
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
];

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const { profile, marketItems, addMarketItem, toggleSold, deleteMarketItem, refreshData } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>("all");
  const [showPost, setShowPost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [itemCategory, setItemCategory] = useState<MarketItem["category"]>("textbooks");
  const [itemCondition, setItemCondition] = useState<MarketItem["condition"]>("good");
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Store uploaded URLs

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return marketItems.filter((i) => !i.isSold);
    return marketItems.filter((i) => i.category === selectedCategory && !i.isSold);
  }, [marketItems, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const validatePrice = (price: string): boolean => {
    if (!price.trim()) {
      setPriceError("Price is required");
      return false;
    }
    const parsedPrice = parseFloat(price);
    if (!Number.isFinite(parsedPrice)) {
      setPriceError("Please enter a valid number");
      return false;
    }
    if (parsedPrice <= 0) {
      setPriceError("Price must be greater than $0");
      return false;
    }
    if (parsedPrice > 99999) {
      setPriceError("Price cannot exceed $99,999");
      return false;
    }
    setPriceError("");
    return true;
  };

  const uploadImage = async (media: SelectedMedia): Promise<string | null> => {
    try {
      const ext = media.uri.split(".").pop()?.toLowerCase() || "jpg";
      const path = `market/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const response = await fetch(media.uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from("whispr-media")
        .upload(path, blob, { contentType: "image/jpeg" });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("whispr-media")
        .getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handlePost = async () => {
    if (!itemTitle.trim() || !profile || isPosting) return;

    if (!validatePrice(itemPrice)) {
      return;
    }

    setIsPosting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const success = await addMarketItem({
        title: itemTitle.trim(),
        description: itemDescription.trim(),
        price: parseFloat(itemPrice),
        category: itemCategory,
        condition: itemCondition,
        sellerId: profile.id,
        sellerAlias: profile.alias,
        sellerKarma: profile.karma,
        sellerAvatarIndex: profile.avatarIndex,
        imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      } as any);
      if (success) {
        resetForm();
        setShowPost(false);
      }
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddImage = async (media: SelectedMedia | null) => {
    if (!media || selectedImages.length >= 3) return;

    setIsPosting(true);
    const url = await uploadImage(media);
    setIsPosting(false);

    if (url) {
      setSelectedImages([...selectedImages, url]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setItemTitle("");
    setItemDescription("");
    setItemPrice("");
    setPriceError("");
    setItemCategory("textbooks");
    setItemCondition("good");
    setSelectedImages([]);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowPost(false);
  };

  const handlePriceChange = (text: string) => {
    // Filter to only allow numbers and one decimal point
    const filtered = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = filtered.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered;
    setItemPrice(sanitized);
    // Clear error when user starts typing
    if (priceError) setPriceError("");
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 }]}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>{filteredItems.length} items available</Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPost(true); }}
          style={styles.sellButton}
        >
          <Ionicons name="pricetag" size={18} color={Colors.dark.text} />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { setSelectedCategory(item.key); Haptics.selectionAsync(); }}
            style={[styles.categoryChip, selectedCategory === item.key && styles.categoryChipActive]}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={selectedCategory === item.key ? Colors.dark.text : Colors.dark.textMuted}
            />
            <Text style={[styles.categoryText, selectedCategory === item.key && styles.categoryTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={48} color={Colors.dark.textMuted} />
      <Text style={styles.emptyTitle}>No items listed</Text>
      <Text style={styles.emptyText}>Be the first to sell something on campus</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MarketCard
            item={item}
            isOwner={item.sellerId === profile?.id}
            onToggleSold={toggleSold}
            onDelete={deleteMarketItem}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.green} colors={[Colors.dark.green]} />
        }
      />

      <Modal visible={showPost} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseModal} />
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.postSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
            <View style={styles.composeHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>List an Item</Text>
              <Pressable
                onPress={handlePost}
                disabled={!itemTitle.trim() || !itemPrice.trim() || isPosting}
                style={[styles.listButton, (!itemTitle.trim() || !itemPrice.trim() || isPosting) && { opacity: 0.4 }]}
              >
                {isPosting ? (
                  <Text style={styles.listButtonText}>Posting...</Text>
                ) : (
                  <Text style={styles.listButtonText}>List</Text>
                )}
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What are you selling?"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={itemTitle}
                  onChangeText={setItemTitle}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.descInput]}
                  placeholder="Describe your item..."
                  placeholderTextColor={Colors.dark.textMuted}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  multiline
                  maxLength={300}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Photos (Max 3)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {selectedImages.map((url, index) => (
                    <View key={index} style={{ position: "relative" }}>
                      <Image source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: Colors.dark.surface }} />
                      <Pressable
                        onPress={() => handleRemoveImage(index)}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          backgroundColor: Colors.dark.card,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: Colors.dark.background,
                        }}
                      >
                        <Ionicons name="close-circle" size={24} color={Colors.dark.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                  {selectedImages.length < 3 && (
                    <MediaPicker
                      selectedMedia={null}
                      onMediaSelected={handleAddImage}
                      allowVideo={false}
                    />
                  )}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price ($)</Text>
                <TextInput
                  style={[styles.input, priceError && styles.inputError]}
                  placeholder="0.00"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={itemPrice}
                  onChangeText={handlePriceChange}
                  keyboardType="decimal-pad"
                />
                {priceError ? (
                  <Text style={styles.errorText}>{priceError}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.chipRow}>
                  {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
                    <Pressable
                      key={cat.key}
                      onPress={() => { setItemCategory(cat.key as MarketItem["category"]); Haptics.selectionAsync(); }}
                      style={[styles.selectChip, itemCategory === cat.key && styles.selectChipActive]}
                    >
                      <Text style={[styles.selectChipText, itemCategory === cat.key && styles.selectChipTextActive]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Condition</Text>
                <View style={styles.chipRow}>
                  {CONDITIONS.map((cond) => (
                    <Pressable
                      key={cond.key}
                      onPress={() => { setItemCondition(cond.key); Haptics.selectionAsync(); }}
                      style={[styles.selectChip, itemCondition === cond.key && styles.selectChipActive]}
                    >
                      <Text style={[styles.selectChipText, itemCondition === cond.key && styles.selectChipTextActive]}>
                        {cond.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
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
  listContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  sellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dark.green,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryList: {
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.dark.green + "20",
    borderColor: Colors.dark.green + "50",
  },
  categoryText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  categoryTextActive: {
    color: Colors.dark.green,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
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
  postSheet: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "85%",
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
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: Colors.dark.text,
  },
  listButton: {
    backgroundColor: Colors.dark.green,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  listButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.dark.background,
  },
  inputGroup: {
    marginBottom: 18,
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
  descInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  selectChipActive: {
    backgroundColor: Colors.dark.green + "20",
    borderColor: Colors.dark.green + "50",
  },
  selectChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  selectChipTextActive: {
    color: Colors.dark.green,
  },
  inputError: {
    borderColor: "#FF5252",
    borderWidth: 2,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "#FF5252",
    marginTop: 4,
  },
});
