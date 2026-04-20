import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import theme from "../../styles/theme";
import GlassHeader from "../../components/GlassHeader";
import { translate, useTranslationVersion } from "../../services/translateService";
import { loadThemes } from "../../services/themeService";
import { generateAiQuiz } from "../../services/quizService";
import { getItem, saveItem } from "../../utils/storageService";

type ThemeItem = {
  id: number;
  name: string;
};

const QUICK_COUNTS = [10, 20, 50, 100];

export default function AIQuizCreatorScreen({ navigation }: any) {
  useTranslationVersion();
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [screenLoading, setScreenLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState("10");
  const [prompt, setPrompt] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const t = (key: string, fallback: string) => {
    const value = translate(key);
    return value === key ? fallback : value;
  };

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const data = await loadThemes(1, 100, "");
        setThemes(data?.data || []);
      } finally {
        setScreenLoading(false);
      }
    };

    fetchThemes();
  }, []);

  const selectedThemeName = useMemo(
    () => themes.find((item) => item.id === selectedThemeId)?.name || t("aiQuiz.select_theme", "Select a theme"),
    [selectedThemeId, themes]
  );

  const handleSave = async () => {
    const normalizedCount = Math.max(10, Math.min(100, Number(questionCount) || 0));

    if (!selectedThemeId) {
      Alert.alert(t("common.error", "Error"), t("aiQuiz.error.theme_required", "Please choose a theme."));
      return;
    }

    if (!prompt.trim()) {
      Alert.alert(t("common.error", "Error"), t("aiQuiz.error.prompt_required", "Please enter a prompt."));
      return;
    }

    if (normalizedCount < 10 || normalizedCount > 100) {
      Alert.alert(t("common.error", "Error"), t("aiQuiz.error.invalid_count", "Question count must be between 10 and 100."));
      return;
    }

    try {
      setSaving(true);
      const result = await generateAiQuiz({
        fk_theme: selectedThemeId,
        themeName: themes.find((item) => item.id === selectedThemeId)?.name,
        questionCount: normalizedCount,
        prompt: prompt.trim(),
      });

      if (result?.quizId) {
        if (typeof result?.remainingPoints === "number") {
          const storedUserData: any = await getItem("userData");

          if (storedUserData?.user) {
            await saveItem("userData", {
              ...storedUserData,
              user: {
                ...storedUserData.user,
                points: result.remainingPoints,
              },
            });
          }
        }

        const successMessage =
          typeof result?.remainingPoints === "number"
            ? `${t("aiQuiz.success.created", "AI quiz created successfully.")}\n${t("points.remaining", "Remaining points")}: ${result.remainingPoints} ${t("points.unit", "pts")}`
            : t("aiQuiz.success.created", "AI quiz created successfully.");

        Alert.alert(t("common.success", "Success"), successMessage);
        navigation.replace("EditQuizScreen", { quizId: result.quizId });
        return;
      }

      const errorMessage =
        typeof result?.error === "string" && result.error.includes("at least 30 points")
          ? t("points.not_enough", "You need at least 30 points to create a quiz.")
          : result?.error || t("aiQuiz.error.generate_failed", "Unable to generate the quiz.");

      Alert.alert(t("common.error", "Error"), errorMessage);
    } catch (error: any) {
      Alert.alert(t("common.error", "Error"), error?.message || t("aiQuiz.error.generate_failed", "Unable to generate the quiz."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={t("aiQuiz.title", "AI Quiz Creator")}
          subtitle={t("aiQuiz.subtitle", "Create a quiz with Gemini")}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      {screenLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("aiQuiz.theme", "Theme")}</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setIsDropdownOpen((prev) => !prev)}>
              <Text style={styles.dropdownButtonText}>{selectedThemeName}</Text>
              <Text style={styles.dropdownChevron}>{isDropdownOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isDropdownOpen ? (
              <View style={styles.dropdownList}>
                {themes.map((themeItem) => (
                  <TouchableOpacity
                    key={themeItem.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedThemeId(themeItem.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{themeItem.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>{t("aiQuiz.question_count", "Number of questions")}</Text>
            <View style={styles.countChipWrap}>
              {QUICK_COUNTS.map((count) => {
                const active = Number(questionCount) === count;
                return (
                  <TouchableOpacity
                    key={count}
                    style={[styles.countChip, active && styles.countChipActive]}
                    onPress={() => setQuestionCount(String(count))}
                  >
                    <Text style={[styles.countChipText, active && styles.countChipTextActive]}>{count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={questionCount}
              onChangeText={(value) => setQuestionCount(value.replace(/[^0-9]/g, ""))}
              placeholder={t("aiQuiz.count_placeholder", "10 to 100")}
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.helperText}>{t("aiQuiz.count_hint", "Choose a value between 10 and 100 questions.")}</Text>
            <Text style={styles.costHint}>{t("points.creation_cost", "Quiz creation costs 30 points")}</Text>

            <Text style={styles.sectionTitle}>{t("aiQuiz.prompt", "Prompt")}</Text>
            <TextInput
              style={[styles.input, styles.promptInput]}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              textAlignVertical="top"
              placeholder={t("aiQuiz.prompt_placeholder", "Example: create a beginner-friendly space quiz with fun facts and increasing difficulty.")}
              placeholderTextColor={theme.textMuted}
            />

            <TouchableOpacity style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={theme.white} /> : <Text style={styles.primaryButtonText}>{t("aiQuiz.generate_button", "Generate and save")}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  headerArea: {
    backgroundColor: theme.primary,
    paddingBottom: 14,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusCard,
    padding: 18,
  },
  sectionTitle: {
    color: theme.black,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 12,
  },
  dropdownButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    backgroundColor: theme.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownButtonText: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    paddingRight: 10,
  },
  dropdownChevron: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemText: {
    color: theme.black,
    fontSize: 14,
    fontWeight: "600",
  },
  countChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  countChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceSoft,
  },
  countChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  countChipText: {
    color: theme.black,
    fontWeight: "700",
  },
  countChipTextActive: {
    color: theme.white,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    backgroundColor: theme.surfaceSoft,
    color: theme.black,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  promptInput: {
    minHeight: 140,
  },
  helperText: {
    marginTop: 6,
    color: theme.textMuted,
    fontSize: 12,
  },
  costHint: {
    marginTop: 6,
    color: theme.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: theme.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
