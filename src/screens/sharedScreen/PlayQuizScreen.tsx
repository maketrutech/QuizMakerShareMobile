import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import theme from "../../styles/theme";
import { useRoute, useNavigation } from "@react-navigation/native";
import { loadQuizById } from "../../services/quizService";
import { preloadSoundEffects, releaseSoundEffects } from "../../services/soundService";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassHeader from "../../components/GlassHeader";
import { translate } from "../../services/translateService";

const DEFAULT_QUIZ_TIMER = 60;
const BONUS_TIME = 5;
const { width } = Dimensions.get("window");

interface Answer {
  id: number;
  answerText: string;
  is_correct?: boolean;
}

interface Question {
  id: number;
  questionText: string;
  answers: Answer[];
}

interface Quiz {
  id: number;
  name: string;
  description: string;
  timerSeconds?: number;
  questions: Question[];
}

export default function PlayQuizScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { quizId } = route.params;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(DEFAULT_QUIZ_TIMER);
  const [initialTimer, setInitialTimer] = useState(DEFAULT_QUIZ_TIMER);
  const [selectedCorrect, setSelectedCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<number | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      preloadSoundEffects();
      const data = await loadQuizById(quizId);
      const totalTimer = data?.timerSeconds || (data?.questions?.length ? data.questions.length * 15 : DEFAULT_QUIZ_TIMER);
      setQuiz(data);
      setInitialTimer(totalTimer);
      setTimer(totalTimer);
      setLoading(false);
    };

    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (showResult || loading || !quiz) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showResult, loading, quiz]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      releaseSoundEffects();
    };
  }, []);

  if (loading || !quiz) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />;
  }

  const question = !showResult ? quiz.questions[current] : null;

  const handleAnswer = (answerId: number) => {
    if (selected !== null) return;

    setSelected(answerId);
    const currentQuestion = quiz?.questions[current];
    const answer = currentQuestion?.answers.find((answerItem) => answerItem.id === answerId);
    const isCorrect = !!answer?.is_correct;

    setSelectedCorrect(isCorrect);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setTimer((prev) => prev + BONUS_TIME);
    } else {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    setTimeout(() => {
      shakeAnim.setValue(0);
      if (current < quiz.questions.length - 1) {
        setCurrent((prev) => prev + 1);
        setSelected(null);
        setSelectedCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 700);
  };

  const handleReplayQuiz = () => {
    setCurrent(0);
    setSelected(null);
    setSelectedCorrect(null);
    setScore(0);
    setTimer(initialTimer);
    setShowResult(false);
  };

  const progress = `${Math.min((Math.max(timer, 0) / Math.max(initialTimer, 1)) * 100, 100)}%` as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={quiz.name || translate("playQuiz.title")}
          subtitle={`${translate("playQuiz.question")} ${Math.min(current + 1, quiz.questions.length)}/${quiz.questions.length}`}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      {!showResult && (
        <View style={styles.timerWrap}>
          <View style={styles.timerBarContainer}>
            <View style={[styles.timerBar, { width: progress }]} />
            <Text style={styles.timerText}>{Math.max(timer, 0)}s</Text>
          </View>
        </View>
      )}

      {showResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultEyebrow}>{translate("playQuiz.completed")}</Text>
          <Text style={styles.resultTitle}>{translate("playQuiz.finished")}</Text>
          <Text style={styles.resultScore}>{translate("playQuiz.score")}: {score}/{quiz.questions.length}</Text>

          <TouchableOpacity style={styles.resultButton} onPress={handleReplayQuiz}>
            <Text style={styles.resultButtonText}>{translate("playQuiz.replay")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.resultButton, styles.backResultButton]} onPress={() => navigation.goBack()}>
            <Text style={styles.resultButtonText}>{translate("common.back")}</Text>
          </TouchableOpacity>
        </View>
      ) : question ? (
        <View style={styles.quizContent}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreLabel}>{translate("playQuiz.correct_answers")}</Text>
            <Text style={styles.scoreValue}>{score}/{quiz.questions.length}</Text>
          </View>

          <ScrollView style={styles.questionScroll} contentContainerStyle={styles.questionContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.questionText}>{question.questionText}</Text>

            {question.answers.map((answerItem) => {
              const isSelected = selected === answerItem.id;
              const isCorrectAnswer = isSelected && selectedCorrect === true;
              const isWrongAnswer = isSelected && selectedCorrect === false;

              return (
                <Animated.View
                  key={answerItem.id}
                  style={[styles.answerWrapper, isWrongAnswer && { transform: [{ translateX: shakeAnim }] }]}
                >
                  <TouchableOpacity
                    style={[
                      styles.answerButton,
                      isCorrectAnswer && styles.correctAnswer,
                      isWrongAnswer && styles.wrongAnswer,
                      isSelected && !isCorrectAnswer && !isWrongAnswer && styles.selectedAnswer,
                    ]}
                    disabled={selected !== null}
                    onPress={() => handleAnswer(answerItem.id)}
                  >
                    <Text style={styles.answerText}>{answerItem.answerText}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
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
  timerWrap: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  timerBarContainer: {
    height: 40,
    backgroundColor: theme.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  timerBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.secondary,
  },
  timerText: {
    color: theme.black,
    fontWeight: "800",
    fontSize: 16,
  },
  quizContent: {
    flex: 1,
    margin: 20,
    marginTop: 14,
  },
  scoreBadge: {
    alignSelf: "center",
    backgroundColor: theme.surface,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.success,
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scoreValue: {
    fontSize: 24,
    color: theme.success,
    fontWeight: "800",
    marginTop: 2,
  },
  questionScroll: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  questionContainer: {
    padding: 16,
    paddingBottom: 20,
    alignItems: "center",
  },
  questionText: {
    fontSize: 21,
    fontWeight: "800",
    color: theme.black,
    marginBottom: 14,
    textAlign: "center",
    width: "100%",
    lineHeight: 30,
  },
  answerWrapper: {
    width: "100%",
  },
  answerButton: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.secondary,
    borderRadius: 16,
    marginVertical: 6,
    alignItems: "center",
  },
  selectedAnswer: {
    backgroundColor: theme.primary,
  },
  correctAnswer: {
    backgroundColor: theme.success,
  },
  wrongAnswer: {
    backgroundColor: theme.danger,
  },
  answerText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 20,
    width: width - 40,
    alignSelf: "center",
  },
  resultEyebrow: {
    fontSize: 12,
    color: theme.secondary,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 26,
    color: theme.black,
    fontWeight: "800",
    marginBottom: 10,
  },
  resultScore: {
    fontSize: 18,
    color: theme.textMuted,
    marginBottom: 10,
  },
  resultButton: {
    marginTop: 14,
    backgroundColor: theme.secondary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
  },
  backResultButton: {
    backgroundColor: theme.primary,
  },
  resultButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
