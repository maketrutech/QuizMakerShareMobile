import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import theme from "../styles/theme";
import { translate } from "../services/translateService";

export default function LoadingScreen() {
  return (
    <LinearGradient
      colors={[theme.primary, "#b6a6ff", "#ffd6ea"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.badge}>{translate("common.app_name")}</Text>
        <ActivityIndicator size="large" color={theme.secondary} />
        <Text style={styles.text}>{translate("loading")}...</Text>
        <Text style={styles.subtext}>{translate("loading.subtitle")}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: theme.radiusCard,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  badge: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: theme.black,
  },
  subtext: {
    marginTop: 8,
    fontSize: 13,
    color: theme.textMuted,
    textAlign: "center",
  },
});
