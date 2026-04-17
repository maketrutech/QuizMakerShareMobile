import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import theme from "../../styles/theme";
import { saveQuiz } from "../../services/quizService";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadThemes } from "../../services/themeService";
import { getItem } from "../../../src/utils/storageService";
import GlassHeader from "../../components/GlassHeader";
import { translate } from "../../services/translateService";

type ThemeItem = {
  id: number;
  name: string;
};

export default function CreateQuizScreen({ navigation }: any) {
  const [quizTitle, setQuizTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [deviceLanguage, setDeviceLanguage] = useState("fr");

  useEffect(() => {
    const initializeData = async () => {
      const data = await loadThemes(1, 100, "");
      setThemes(data?.data || []);
      const currentLanguage: any = await getItem("deviceLanguage");
      setDeviceLanguage(currentLanguage || "fr");
    };

    initializeData();
  }, []);

  const handleAnswerChange = (text: string, index: number) => {
    const nextAnswers = [...answers];
    nextAnswers[index] = text;
    setAnswers(nextAnswers);
  };

  const resetQuestionForm = () => {
    setQuestionText("");
    setAnswers(["", "", "", ""]);
    setCorrectIndex(null);
  };

  const handleAddNext = () => {
    if (!questionText || correctIndex === null || answers.some((answer) => !answer)) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.fill_question"));
      return;
    }

    const newQuestion = {
      question: questionText,
      options: answers,
      correctAnswer: answers[correctIndex],
      translations: [deviceLanguage],
    };

    setAllQuestions((prev) => [...prev, newQuestion]);
    resetQuestionForm();
    Alert.alert(translate("common.success"), translate("createQuiz.success.question_added"));
  };

  const handleFinalSave = async () => {
    if (!quizTitle) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.title_required"));
      return;
    }

    if (!selectedThemeId) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.theme_required"));
      return;
    }

    if (allQuestions.length === 0) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.questions_required"));
      return;
    }

    try {
      const finalData = {
        name: quizTitle,
        fk_theme: selectedThemeId,
        questions: allQuestions,
        translations: [deviceLanguage],
      };

      const res = await saveQuiz(finalData);
      if (res?.message) {
        Alert.alert(translate("common.success"), translate("createQuiz.success.saved"));
        navigation.goBack();
      } else {
        Alert.alert(translate("common.error"), translate("createQuiz.error.save_failed"));
      }
    } catch (error) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.save_failed"));
    }
  };

  const selectedThemeName =
    themes.find((themeItem) => themeItem.id === selectedThemeId)?.name || translate("createQuiz.select_theme");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("createQuiz.title")}
          subtitle={translate("createQuiz.subtitle")}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>{translate("createQuiz.overview")}</Text>
          <TextInput
            style={styles.quizTitleInput}
            placeholder={translate("createQuiz.quiz_title")}
            placeholderTextColor={theme.textMuted}
            value={quizTitle}
            onChangeText={setQuizTitle}
          />
          <Text style={styles.countText}>{translate("createQuiz.questions_added")}: {allQuestions.length}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{translate("createQuiz.theme")}</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
            <Text style={styles.dropdownButtonText}>{selectedThemeName}</Text>
            <Text style={styles.dropdownChevron}>{isDropdownOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {isDropdownOpen && (
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
          )}

          <Text style={styles.sectionTitle}>{translate("createQuiz.question")}</Text>
          <TextInput
            style={[styles.input, styles.questionInput]}
            placeholder={translate("createQuiz.question_placeholder")}
            placeholderTextColor={theme.textMuted}
            value={questionText}
            onChangeText={setQuestionText}
            multiline
          />

          <Text style={styles.sectionTitle}>{translate("createQuiz.answers")}</Text>
          {answers.map((answer, index) => (
            <View key={index} style={styles.answerRow}>
              <TextInput
                style={styles.answerInput}
                placeholder={`${translate("createQuiz.answer")} ${index + 1}`}
                placeholderTextColor={theme.textMuted}
                value={answer}
                onChangeText={(text) => handleAnswerChange(text, index)}
              />
              <TouchableOpacity
                onPress={() => setCorrectIndex(index)}
                style={[styles.checkbox, correctIndex === index && styles.checkboxActive]}
              >
                <Text style={[styles.checkboxText, correctIndex === index && styles.checkboxTextActive]}>
                  {correctIndex === index ? "✓" : ""}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleAddNext}>
              <Text style={styles.buttonText}>{translate("createQuiz.add_question")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleFinalSave}>
              <Text style={styles.buttonText}>{translate("createQuiz.finish_save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    marginBottom: 16,
  },
  summaryEyebrow: {
    color: theme.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  quizTitleInput: {
    backgroundColor: theme.surfaceSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.black,
    borderWidth: 1,
    borderColor: theme.border,
  },
  countText: {
    color: theme.textMuted,
    marginTop: 10,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  sectionTitle: {
    fontWeight: "800",
    marginBottom: 8,
    color: theme.black,
    marginTop: 10,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 15,
    color: theme.black,
    backgroundColor: theme.surfaceSoft,
    textAlignVertical: "top",
  },
  questionInput: {
    minHeight: 96,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    backgroundColor: theme.surfaceSoft,
    color: theme.black,
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.white,
  },
  checkboxActive: {
    backgroundColor: theme.primary,
  },
  checkboxText: {
    color: theme.primary,
    fontWeight: "800",
  },
  checkboxTextActive: {
    color: theme.white,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 10,
  },
  nextButton: {
    flex: 1,
    backgroundColor: theme.secondary,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: theme.white,
    fontWeight: "800",
  },
  dropdownButton: {
    backgroundColor: theme.surfaceSoft,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  dropdownButtonText: {
    color: theme.black,
    fontSize: 14,
  },
  dropdownChevron: {
    color: theme.primary,
    fontSize: 12,
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemText: {
    color: theme.black,
    fontSize: 14,
  },
});