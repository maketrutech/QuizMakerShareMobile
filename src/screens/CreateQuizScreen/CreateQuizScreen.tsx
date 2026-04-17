import React, { useEffect, useState } from "react";
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
import theme from "../../styles/theme";
import { loadQuizById, saveQuiz, updateQuiz } from "../../services/quizService";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadThemes } from "../../services/themeService";
import { getItem } from "../../../src/utils/storageService";
import GlassHeader from "../../components/GlassHeader";
import { translate } from "../../services/translateService";

type ThemeItem = {
  id: number;
  name: string;
};

type EditableQuestion = {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: string;
  translations: string[];
};

const EMPTY_ANSWERS = ["", "", "", ""];

const ensureFourAnswers = (items: string[] = []) => {
  const nextItems = [...items];

  while (nextItems.length < 4) {
    nextItems.push("");
  }

  return nextItems.slice(0, 4);
};

export default function CreateQuizScreen({ navigation, route }: any) {
  const quizId = route?.params?.quizId;
  const isEditMode = Boolean(quizId);
  const [quizTitle, setQuizTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answers, setAnswers] = useState([...EMPTY_ANSWERS]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allQuestions, setAllQuestions] = useState<EditableQuestion[]>([]);
  const [deviceLanguage, setDeviceLanguage] = useState("fr");
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [screenLoading, setScreenLoading] = useState(false);

  const resetQuestionForm = () => {
    setQuestionText("");
    setAnswers([...EMPTY_ANSWERS]);
    setCorrectIndex(null);
    setEditingQuestionIndex(null);
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setScreenLoading(isEditMode);
        const data = await loadThemes(1, 100, "");
        setThemes(data?.data || []);

        const currentLanguage: any = await getItem("deviceLanguage");
        const nextLanguage = currentLanguage || "fr";
        setDeviceLanguage(nextLanguage);

        if (isEditMode) {
          const quizData = await loadQuizById(Number(quizId));

          if (quizData) {
            setQuizTitle(quizData.name || "");
            setSelectedThemeId(Number(quizData.themeId) || null);
            setAllQuestions(
              (quizData.questions || []).map((item: any) => {
                const mappedOptions = ensureFourAnswers(
                  (item.answers || []).map((answer: any) => answer.answerText || "")
                );

                return {
                  id: item.id,
                  question: item.questionText || "",
                  options: mappedOptions,
                  correctAnswer:
                    item.answers?.find((answer: any) => answer.is_correct)?.answerText ||
                    mappedOptions[0] ||
                    "",
                  translations: [nextLanguage],
                };
              })
            );
          }
        } else {
          setQuizTitle("");
          setSelectedThemeId(null);
          setAllQuestions([]);
          resetQuestionForm();
        }
      } catch (error) {
        Alert.alert(translate("common.error"), translate("createQuiz.error.save_failed"));

        if (isEditMode) {
          navigation.goBack();
        }
      } finally {
        setScreenLoading(false);
      }
    };

    initializeData();
  }, [isEditMode, navigation, quizId]);

  const handleAnswerChange = (text: string, index: number) => {
    const nextAnswers = [...answers];
    nextAnswers[index] = text;
    setAnswers(nextAnswers);
  };

  const handleEditQuestion = (index: number) => {
    const currentQuestion = allQuestions[index];
    const currentAnswers = ensureFourAnswers(currentQuestion?.options || []);
    const nextCorrectIndex = currentAnswers.findIndex((item) => item === currentQuestion.correctAnswer);

    setQuestionText(currentQuestion.question || "");
    setAnswers(currentAnswers);
    setCorrectIndex(nextCorrectIndex >= 0 ? nextCorrectIndex : null);
    setEditingQuestionIndex(index);
  };

  const handleDeleteQuestion = (index: number) => {
    setAllQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

    if (editingQuestionIndex === index) {
      resetQuestionForm();
    } else if (editingQuestionIndex !== null && editingQuestionIndex > index) {
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
  };

  const buildCurrentQuestion = () => {
    const trimmedQuestion = questionText.trim();
    const normalizedAnswers = answers.map((answer) => answer.trim());
    const hasStartedDraft =
      trimmedQuestion.length > 0 || normalizedAnswers.some((answer) => answer.length > 0) || correctIndex !== null;

    if (!hasStartedDraft) {
      return null;
    }

    if (!trimmedQuestion || correctIndex === null || normalizedAnswers.some((answer) => !answer)) {
      return false;
    }

    const nextQuestion: EditableQuestion = {
      id: editingQuestionIndex !== null ? allQuestions[editingQuestionIndex]?.id : undefined,
      question: trimmedQuestion,
      options: normalizedAnswers,
      correctAnswer: normalizedAnswers[correctIndex],
      translations: [deviceLanguage],
    };

    return nextQuestion;
  };

  const handleAddNext = () => {
    const nextQuestion = buildCurrentQuestion();

    if (!nextQuestion) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.fill_question"));
      return;
    }

    if (editingQuestionIndex !== null) {
      setAllQuestions((prev) => prev.map((item, index) => (index === editingQuestionIndex ? nextQuestion : item)));
    } else {
      setAllQuestions((prev) => [...prev, nextQuestion]);
    }

    resetQuestionForm();
    Alert.alert(translate("common.success"), translate("createQuiz.success.question_added"));
  };

  const handleFinalSave = async () => {
    if (!quizTitle.trim()) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.title_required"));
      return;
    }

    if (!selectedThemeId) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.theme_required"));
      return;
    }

    const pendingQuestion = buildCurrentQuestion();
    if (pendingQuestion === false) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.fill_question"));
      return;
    }

    const questionsToSave = pendingQuestion
      ? editingQuestionIndex !== null
        ? allQuestions.map((item, index) => (index === editingQuestionIndex ? pendingQuestion : item))
        : [...allQuestions, pendingQuestion]
      : allQuestions;

    if (questionsToSave.length === 0) {
      Alert.alert(translate("common.error"), translate("createQuiz.error.questions_required"));
      return;
    }

    try {
      setAllQuestions(questionsToSave);

      const finalData = {
        name: quizTitle.trim(),
        fk_theme: selectedThemeId,
        questions: questionsToSave.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          translations: item.translations?.length ? item.translations : [deviceLanguage],
        })),
        translations: [deviceLanguage],
      };

      const res = isEditMode
        ? await updateQuiz(Number(quizId), finalData)
        : await saveQuiz(finalData);

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
          title={quizTitle || translate("createQuiz.title")}
          subtitle={translate("createQuiz.subtitle")}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      {screenLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
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

            {allQuestions.map((item, index) => {
              const isActive = editingQuestionIndex === index;

              return (
                <View
                  key={`${item.id || "new"}-${index}`}
                  style={[styles.savedQuestionCard, isActive && styles.savedQuestionCardActive]}
                >
                  <TouchableOpacity
                    style={styles.savedQuestionContent}
                    activeOpacity={0.85}
                    onPress={() => handleEditQuestion(index)}
                  >
                    <Text style={styles.savedQuestionTitle}>{item.question}</Text>
                    {item.options.map((option, optionIndex) => (
                      <Text
                        key={`${item.id || index}-${optionIndex}`}
                        style={[
                          styles.savedAnswerText,
                          option === item.correctAnswer && styles.savedAnswerTextCorrect,
                        ]}
                      >
                        {optionIndex + 1}. {option} {option === item.correctAnswer ? "✓" : ""}
                      </Text>
                    ))}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteQuestionButton} onPress={() => handleDeleteQuestion(index)}>
                    <Text style={styles.deleteQuestionButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
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
    justifyContent: "center",
    alignItems: "center",
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
  savedQuestionCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    backgroundColor: theme.surfaceSoft,
    flexDirection: "row",
    alignItems: "flex-start",
    overflow: "hidden",
  },
  savedQuestionCardActive: {
    borderColor: theme.primary,
    backgroundColor: theme.surface,
  },
  savedQuestionContent: {
    flex: 1,
    padding: 14,
  },
  savedQuestionTitle: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  savedAnswerText: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  savedAnswerTextCorrect: {
    color: theme.primary,
    fontWeight: "700",
  },
  deleteQuestionButton: {
    width: 42,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: `${theme.danger}18`,
  },
  deleteQuestionButtonText: {
    color: theme.danger,
    fontSize: 22,
    fontWeight: "800",
  },
});