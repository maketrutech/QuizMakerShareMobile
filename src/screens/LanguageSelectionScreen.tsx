import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import theme from "../styles/theme";
import {
  getCurrentLanguage,
  setAppLanguage,
  translate,
  useTranslationVersion,
} from "../services/translateService";
import { getItem, saveItem } from "../utils/storageService";

const LANGUAGE_OPTIONS = [
  { code: "en", labelKey: "language.option.en", fallback: "English" },
  { code: "fr", labelKey: "language.option.fr", fallback: "Français" },
  { code: "es", labelKey: "language.option.es", fallback: "Español" },
  { code: "hi", labelKey: "language.option.hi", fallback: "हिन्दी" },
  { code: "ar", labelKey: "language.option.ar", fallback: "العربية" },
];

const CONTINUE_LABELS: Record<string, string> = {
  en: "Continue",
  fr: "Continuer",
  es: "Continuar",
  hi: "जारी रखें",
  ar: "متابعة",
};

const t = (key: string, fallback: string) => {
  const value = translate(key);
  return value === key ? fallback : value;
};

export default function LanguageSelectionScreen({ navigation, route }: any) {
  useTranslationVersion();
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      const currentLanguage = await getCurrentLanguage();
      setSelectedLanguage(currentLanguage || "en");
    };

    loadLanguage();
  }, []);

  const handleContinue = async () => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      await setAppLanguage(selectedLanguage);
      await saveItem("hasCompletedLanguageSelection", true);

      const userData: any = await getItem("userData");
      if (userData?.user) {
        await saveItem("userData", {
          ...userData,
          user: {
            ...userData.user,
            language: selectedLanguage,
          },
        });
      }

      const destination = route?.params?.destination || (userData?.token ? "MainApp" : "Home");

      navigation.reset({
        index: 0,
        routes: [{ name: destination }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#8f7cff", "#b6a6ff", "#ffd2e6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.badge}>🌍 {t("profile.language", "Language")}</Text>
          <Text style={styles.title}>{t("profile.language", "Choose your language")}</Text>
          <Text style={styles.subtitle}>
            {t("profile.language_subtitle", "Select your app language before you continue")}
          </Text>

          <View style={styles.languageList}>
            {LANGUAGE_OPTIONS.map((item) => {
              const isSelected = selectedLanguage === item.code;

              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
                  onPress={() => setSelectedLanguage(item.code)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.languageOptionText, isSelected && styles.languageOptionTextSelected]}>
                    {item.fallback}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.continueButton, saving && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.continueButtonText}>
                {CONTINUE_LABELS[selectedLanguage] || CONTINUE_LABELS.en}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#8f7cff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: theme.radiusCard,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  badge: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    color: theme.black,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  languageList: {
    gap: 10,
  },
  languageOption: {
    borderWidth: 1.2,
    borderColor: theme.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.white,
  },
  languageOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: "#efeaff",
  },
  languageOptionText: {
    color: theme.black,
    fontSize: 16,
    fontWeight: "700",
  },
  languageOptionTextSelected: {
    color: theme.primary,
  },
  continueButton: {
    marginTop: 18,
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
