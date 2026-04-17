import React from "react";
import { View, Image, StyleSheet, Dimensions, Text, TouchableOpacity } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import theme from "../styles/theme";
import { translate } from "../services/translateService";

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }: any) {
  return (
    <LinearGradient
      colors={["#8f7cff", "#b6a6ff", "#ffd2e6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.heroCard}>
        <Image
          source={require("../assets/images/quiz-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.badge}>{translate("home.badge")}</Text>
        <Text style={styles.title}>{translate("home.title")} 🎮</Text>
        <Text style={styles.subtitle}>{translate("home.subtitle")}</Text>

        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginButtonTitle}>{translate("home.login_button")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.registerButtonTitle}>{translate("home.register_button")}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: theme.radiusCard,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: width * 0.72,
    height: width * 0.58,
    marginBottom: 8,
  },
  badge: {
    color: theme.primary,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: theme.black,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    width: "100%",
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  loginButtonTitle: {
    color: theme.white,
    fontSize: theme.fontSizeButton,
    fontWeight: "800",
  },
  registerButton: {
    width: "100%",
    borderColor: theme.secondary,
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  registerButtonTitle: {
    color: theme.secondary,
    fontSize: theme.fontSizeButton,
    fontWeight: "800",
  },
});
