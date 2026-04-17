import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import colors from "../../styles/theme";
import GlassHeader from "../../components/GlassHeader";
import { translate } from "../../services/translateService";

export default function HomeConnectedScreen({ navigation }: any) {
  const parentNavigation = navigation.getParent?.();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("dashboard.welcome_back")}
          subtitle={translate("dashboard.subtitle")}
        />
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.tile, styles.primaryTile]}
          onPress={() => parentNavigation?.navigate("ThemeScreen")}
        >
          <Text style={styles.tileEyebrow}>{translate("dashboard.discover")}</Text>
          <Text style={styles.tileTitle}>{translate("dashboard.explore_themes")}</Text>
          <Text style={styles.tileText}>{translate("dashboard.explore_themes_text")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, styles.secondaryTile]}
          onPress={() => parentNavigation?.navigate("Profil")}
        >
          <Text style={[styles.tileEyebrow, { color: colors.secondary }]}>{translate("dashboard.create")}</Text>
          <Text style={styles.tileTitle}>{translate("dashboard.open_profile_tools")}</Text>
          <Text style={styles.tileText}>{translate("dashboard.open_profile_tools_text")}</Text>
        </TouchableOpacity>
      </View>
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
    flex: 1,
    padding: 20,
    gap: 14,
  },
  tile: {
    borderRadius: colors.radiusCard,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryTile: {
    backgroundColor: colors.surface,
  },
  secondaryTile: {
    backgroundColor: colors.surfaceSoft,
  },
  tileEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  tileTitle: {
    color: colors.black,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  tileText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
