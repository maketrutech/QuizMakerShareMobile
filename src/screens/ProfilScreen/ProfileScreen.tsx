import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import colors from "../../styles/theme";
import { removeItem } from "../../utils/storageService";
import { useNavigation } from "@react-navigation/native";
import GlassHeader from "../../components/GlassHeader";
import { translate } from "../../services/translateService";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    await removeItem("userData");

    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("profile.title")}
          subtitle={translate("profile.subtitle")}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoEyebrow}>{translate("profile.your_space")}</Text>
          <Text style={styles.infoTitle}>{translate("profile.keep_building")}</Text>
          <Text style={styles.infoText}>{translate("profile.keep_building_text")}</Text>
        </View>

        <TouchableOpacity style={styles.accentButton} onPress={() => navigation.navigate("MyQuizScreen")}>
          <Text style={styles.accentButtonText}>{translate("profile.my_quiz")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("CreateQuizScreen")}>
          <Text style={styles.primaryButtonText}>{translate("profile.create_quiz")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
          <Text style={styles.secondaryButtonText}>{translate("profile.logout")}</Text>
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
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: colors.radiusCard,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  infoEyebrow: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  infoTitle: {
    color: colors.black,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  accentButton: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  accentButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: "700",
  },
});
