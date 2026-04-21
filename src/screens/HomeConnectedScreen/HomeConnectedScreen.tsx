import React from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import colors from "../../styles/theme";
import GlassHeader from "../../components/GlassHeader";
import { translate, useTranslationVersion } from "../../services/translateService";
import commonStyles from "../../styles/commonStyles";

export default function HomeConnectedScreen({ navigation }: any) {
  useTranslationVersion();
  const insets = useSafeAreaInsets();
  const parentNavigation = navigation.getParent?.();
  const t = (key: string, fallback: string) => {
    const value = translate(key);
    return value === key ? fallback : value;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("dashboard.welcome_back")}
          subtitle={translate("dashboard.subtitle")}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 108, 132) }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#8f7cff", "#b6a6ff", "#ffd2e6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, commonStyles.softCardShadow]}
        >
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t("dashboard.create", "Create")}</Text>
            </View>
            <View style={[styles.heroBadge, styles.heroBadgeAlt]}>
              <Text style={[styles.heroBadgeText, styles.heroBadgeAltText]}>{t("home.badge", "Quiz Time")}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{t("home.title", "Build your next quiz adventure")} 🎮</Text>
          <Text style={styles.heroText}>
            {t("dashboard.open_profile_tools_text", "Jump into creation, explore fresh themes, and keep your quiz world moving.")}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>30</Text>
              <Text style={styles.statLabel}>{t("points.unit", "pts")}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>∞</Text>
              <Text style={styles.statLabel}>{t("dashboard.discover", "Discover")}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>{t("profile.title", "Profile")}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.heroPrimaryButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("CreateQuizScreen")}
          >
            <FontAwesomeFreeSolid name={"wand-magic-sparkles" as any} size={18} color={colors.white} />
            <Text style={styles.heroPrimaryButtonText}>{t("profile.create_quiz", "Create quiz")}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={[styles.featureCard, commonStyles.softCardShadow]}
          activeOpacity={0.92}
          onPress={() => parentNavigation?.navigate("ThemeScreen")}
        >
          <LinearGradient
            colors={["#fff9ed", "#eefcff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureCardGradient}
          >
            <View style={styles.featureCardHeader}>
              <View>
                <Text style={styles.discoveryEyebrow}>{t("dashboard.discover", "Discover")}</Text>
                <Text style={styles.featureCardTitle}>{translate("dashboard.explore_themes")}</Text>
              </View>
              <View style={[styles.iconWrap, styles.discoveryIconWrap]}>
                <FontAwesomeFreeSolid name={"palette" as any} size={20} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.featureCardText}>{translate("dashboard.explore_themes_text")}</Text>

            <View style={styles.featureLinkRow}>
              <Text style={styles.featureLinkText}>{t("themeBrowse.title", "Explore themes")}</Text>
              <FontAwesomeFreeSolid name={"arrow-right" as any} size={14} color={colors.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, commonStyles.softCardShadow]}
          activeOpacity={0.92}
          onPress={() => navigation.navigate("MultiplayerQuizScreen")}
        >
          <LinearGradient
            colors={["#f7efff", "#fff4fb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureCardGradient}
          >
            <View style={styles.featureCardHeader}>
              <View>
                <Text style={styles.discoveryEyebrow}>{t("dashboard.create", "Create")}</Text>
                <Text style={styles.featureCardTitle}>{t("home.multiplayer_title", "Play multiplayer")}</Text>
              </View>
              <View style={[styles.iconWrap, styles.multiplayerIconWrap]}>
                <FontAwesomeFreeSolid name={"users" as any} size={20} color={colors.secondary} />
              </View>
            </View>

            <Text style={styles.featureCardText}>
              {t("home.multiplayer_subtitle", "Buzz first, answer fast, and battle three other players in real time.")}
            </Text>

            <View style={styles.featureLinkRow}>
              <Text style={styles.featureLinkText}>{t("home.multiplayer_cta", "Open multiplayer")}</Text>
              <FontAwesomeFreeSolid name={"arrow-right" as any} size={14} color={colors.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.secondaryCard, commonStyles.softCardShadow]}
            activeOpacity={0.92}
            onPress={() => parentNavigation?.navigate("Profil")}
          >
            <View style={styles.secondaryCardTop}>
              <Text style={styles.secondaryEyebrow}>{t("profile.your_space", "Your space")}</Text>
              <View style={[styles.iconWrap, styles.profileIconWrap]}>
                <FontAwesomeFreeSolid name={"circle-user" as any} size={18} color={colors.secondary} />
              </View>
            </View>
            <Text style={styles.secondaryCardTitle}>{t("dashboard.open_profile_tools", "Open profile tools")}</Text>
            <Text style={styles.secondaryCardText}>{t("profile.subtitle", "Manage your avatar, language, quizzes, and account.")}</Text>
          </TouchableOpacity>

         
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    backgroundColor: colors.primary,
    paddingBottom: 14,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    overflow: "hidden",
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
  },
  heroBadgeAlt: {
    backgroundColor: "rgba(255,245,252,0.92)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  heroBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroBadgeAltText: {
    color: colors.secondary,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 36,
    marginBottom: 10,
  },
  heroText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: "92%",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
  },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  statValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroPrimaryButton: {
    backgroundColor: colors.black,
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  heroPrimaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  featureCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  featureCardGradient: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
  },
  featureCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 10,
  },
  discoveryEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  featureCardTitle: {
    color: colors.black,
    fontSize: 24,
    fontWeight: "800",
  },
  featureCardText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  featureLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  bottomRow: {
    gap: 16,
  },
  secondaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  secondaryCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  secondaryEyebrow: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  secondaryCardTitle: {
    color: colors.black,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 6,
  },
  secondaryCardText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: "#fff4f8",
    borderColor: "#ffd8e6",
  },
  tipEyebrow: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  tipTitle: {
    color: colors.black,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  tipText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryIconWrap: {
    backgroundColor: "rgba(143,124,255,0.14)",
  },
  profileIconWrap: {
    backgroundColor: "rgba(255,141,183,0.14)",
  },
  multiplayerIconWrap: {
    backgroundColor: "rgba(255,141,183,0.16)",
  },
});
