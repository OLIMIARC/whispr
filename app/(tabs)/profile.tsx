import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import Avatar from "@/components/Avatar";
import KarmaBadge from "@/components/KarmaBadge";
import { useApp } from "@/lib/app-context";
import { getKarmaLevel, getKarmaTitle } from "@/lib/storage";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, confessions, crushes, marketItems, isAfterDark } = useApp();

  const myConfessions = useMemo(
    () => confessions.filter((c) => c.authorId === profile?.id),
    [confessions, profile]
  );

  const myListings = useMemo(
    () => marketItems.filter((i) => i.sellerId === profile?.id),
    [marketItems, profile]
  );

  const totalReactionsReceived = useMemo(
    () =>
      myConfessions.reduce(
        (sum, c) =>
          sum + Object.values(c.reactions).reduce((s, arr) => s + arr.length, 0),
        0
      ),
    [myConfessions]
  );

  const mutualCrushes = useMemo(
    () => crushes.filter((c) => c.isMutual && c.isRevealed).length,
    [crushes]
  );

  if (!profile) return null;

  const karmaLevel = getKarmaLevel(profile.karma);
  const karmaTitle = getKarmaTitle(profile.karma);
  const karmaColor = Colors.dark.karma[karmaLevel];

  const nextLevel =
    karmaLevel === "low" ? 50 : karmaLevel === "medium" ? 200 : karmaLevel === "high" ? 500 : 1000;
  const prevLevel =
    karmaLevel === "low" ? 0 : karmaLevel === "medium" ? 50 : karmaLevel === "high" ? 200 : 500;
  const progress = Math.min(
    ((profile.karma - prevLevel) / (nextLevel - prevLevel)) * 100,
    100
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400).delay(0)} style={styles.profileHeader}>
        <Avatar index={profile.avatarIndex} size={72} />
        <Text style={styles.alias}>{profile.alias}</Text>
        <View style={styles.karmaRow}>
          <KarmaBadge karma={profile.karma} size="large" />
          <View style={[styles.titleBadge, { backgroundColor: karmaColor + "15" }]}>
            <Text style={[styles.titleText, { color: karmaColor }]}>{karmaTitle}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.karmaProgressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Karma Progress</Text>
          <Text style={[styles.progressTarget, { color: karmaColor }]}>
            {profile.karma} / {nextLevel}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%` as any,
                backgroundColor: karmaColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressHint}>
          {nextLevel - profile.karma} more karma to reach next level
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: Colors.dark.primary + "15" }]}>
            <Ionicons name="chatbubble-ellipses" size={20} color={Colors.dark.primary} />
          </View>
          <Text style={styles.statNumber}>{profile.confessionsCount}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: Colors.dark.reaction.fire + "15" }]}>
            <Ionicons name="flame" size={20} color={Colors.dark.reaction.fire} />
          </View>
          <Text style={styles.statNumber}>{totalReactionsReceived}</Text>
          <Text style={styles.statLabel}>Reactions</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: Colors.dark.secondary + "15" }]}>
            <Ionicons name="heart" size={20} color={Colors.dark.secondary} />
          </View>
          <Text style={styles.statNumber}>{crushes.length}</Text>
          <Text style={styles.statLabel}>Crushes</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIconBg, { backgroundColor: Colors.dark.gold + "15" }]}>
            <Ionicons name="sparkles" size={20} color={Colors.dark.gold} />
          </View>
          <Text style={styles.statNumber}>{mutualCrushes}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.achievementsCard}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementsList}>
          <AchievementItem
            icon="chatbubbles"
            color={Colors.dark.primary}
            title="First Whisper"
            description="Posted your first confession"
            unlocked={profile.confessionsCount >= 1}
          />
          <AchievementItem
            icon="flame"
            color={Colors.dark.reaction.fire}
            title="Fire Starter"
            description="Get 10+ reactions on a post"
            unlocked={totalReactionsReceived >= 10}
          />
          <AchievementItem
            icon="heart"
            color={Colors.dark.secondary}
            title="Cupid's Arrow"
            description="Send your first crush"
            unlocked={crushes.length >= 1}
          />
          <AchievementItem
            icon="sparkles"
            color={Colors.dark.gold}
            title="Match Made"
            description="Get a mutual crush match"
            unlocked={mutualCrushes >= 1}
          />
          <AchievementItem
            icon="storefront"
            color={Colors.dark.green}
            title="Entrepreneur"
            description="List an item on marketplace"
            unlocked={myListings.length >= 1}
          />
          <AchievementItem
            icon="moon"
            color={Colors.dark.accent}
            title="Night Owl"
            description="Post during After Dark hours"
            unlocked={confessions.some((c) => c.isAfterDark && c.authorId === profile.id)}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.dark.accent} />
          <Text style={styles.infoText}>Your identity is completely anonymous</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="refresh" size={18} color={Colors.dark.secondary} />
          <Text style={styles.infoText}>Your alias is randomly generated</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="sparkles" size={18} color={Colors.dark.gold} />
          <Text style={styles.infoText}>Earn karma by posting and reacting</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function AchievementItem({
  icon,
  color,
  title,
  description,
  unlocked,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
  unlocked: boolean;
}) {
  return (
    <View style={[styles.achievementItem, !unlocked && styles.achievementLocked]}>
      <View style={[styles.achievementIcon, { backgroundColor: unlocked ? color + "20" : Colors.dark.surface }]}>
        <Ionicons
          name={icon}
          size={20}
          color={unlocked ? color : Colors.dark.textMuted}
        />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, !unlocked && { color: Colors.dark.textMuted }]}>{title}</Text>
        <Text style={styles.achievementDesc}>{description}</Text>
      </View>
      {unlocked && <Ionicons name="checkmark-circle" size={20} color={Colors.dark.green} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  alias: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    color: Colors.dark.text,
    marginTop: 12,
  },
  karmaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  titleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  titleText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
  },
  karmaProgressCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  progressTarget: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.surface,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressHint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.dark.text,
  },
  statLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  achievementsCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.dark.text,
    marginBottom: 14,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.dark.text,
  },
  achievementDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
});
