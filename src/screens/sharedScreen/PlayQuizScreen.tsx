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
  Easing,
  Image,
} from "react-native";
import theme from "../../styles/theme";
import { useRoute, useNavigation } from "@react-navigation/native";
import { loadQuizById, loadQuizLeaderboard, recordQuizPlay, toggleQuizLike } from "../../services/quizService";
import { preloadSoundEffects, releaseSoundEffects } from "../../services/soundService";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassHeader from "../../components/GlassHeader";
import { translate } from "../../services/translateService";
import { getAvatarSource } from "../../utils/avatarOptions";

const DEFAULT_QUIZ_TIMER = 60;
const BONUS_TIME = 5;
const LEADERBOARD_WINDOW = 11;
const LEADERBOARD_TOP_WINDOW = 5;
const LEADERBOARD_AFTER_WINDOW = 10;
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
  userStats?: {
    playCount?: number;
    bestScore?: number;
    isLiked?: boolean;
  };
  questions: Question[];
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  avatar?: string;
  bestScore: number;
  playCount: number;
  isCurrentUser?: boolean;
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
  const [didSubmitResult, setDidSubmitResult] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardTopLoading, setLeaderboardTopLoading] = useState(false);
  const [leaderboardMoreLoading, setLeaderboardMoreLoading] = useState(false);
  const [hasMoreAbove, setHasMoreAbove] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const mergeLeaderboardEntries = (currentEntries: LeaderboardEntry[], nextEntries: LeaderboardEntry[]) => {
    const byRank = new Map<number, LeaderboardEntry>();
    [...currentEntries, ...nextEntries].forEach((item) => {
      byRank.set(item.rank, item);
    });

    return Array.from(byRank.values()).sort((a, b) => a.rank - b.rank);
  };

  const applyLeaderboardResponse = (payload: any, mode: "around" | "top" | "after") => {
    const nextItems: LeaderboardEntry[] = Array.isArray(payload?.data) ? payload.data : [];

    setCurrentUserRank(payload?.currentUserRank ?? null);
    setHasMoreAbove(Boolean(payload?.hasMoreAbove));
    setHasMoreBelow(Boolean(payload?.hasMoreBelow));
    setLeaderboard((prev) => (mode === "around" ? nextItems : mergeLeaderboardEntries(prev, nextItems)));
  };

  const fetchLeaderboard = async (mode: "around" | "top" | "after" = "around") => {
    if (!quizId) {
      return;
    }

    if (mode === "top") {
      if (!hasMoreAbove || leaderboardTopLoading) {
        return;
      }
      setLeaderboardTopLoading(true);
    } else if (mode === "after") {
      if (!hasMoreBelow || leaderboardMoreLoading || leaderboard.length === 0) {
        return;
      }
      setLeaderboardMoreLoading(true);
    } else {
      setLeaderboardLoading(true);
    }

    try {
      const payload =
        mode === "top"
          ? await loadQuizLeaderboard(quizId, { view: "top", limit: LEADERBOARD_TOP_WINDOW })
          : mode === "after"
            ? await loadQuizLeaderboard(quizId, {
                view: "after",
                startRank: (leaderboard[leaderboard.length - 1]?.rank || 0) + 1,
                limit: LEADERBOARD_AFTER_WINDOW,
              })
            : await loadQuizLeaderboard(quizId, { view: "around", limit: LEADERBOARD_WINDOW });

      if (payload) {
        applyLeaderboardResponse(payload, mode);
      }
    } finally {
      setLeaderboardLoading(false);
      setLeaderboardTopLoading(false);
      setLeaderboardMoreLoading(false);
    }
  };

  const handleLeaderboardScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;

    if (contentOffset.y <= 12) {
      fetchLeaderboard("top");
    }

    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) {
      fetchLeaderboard("after");
    }
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      preloadSoundEffects();
      const data = await loadQuizById(quizId);
      const totalTimer = data?.timerSeconds || (data?.questions?.length ? data.questions.length * 15 : DEFAULT_QUIZ_TIMER);
      setQuiz(data);
      setIsLiked(Boolean(data?.userStats?.isLiked));
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

  useEffect(() => {
    if (!showResult || !quiz || didSubmitResult) {
      return;
    }

    const syncResultAndLeaderboard = async () => {
      setDidSubmitResult(true);
      await recordQuizPlay(quiz.id, {
        score,
        totalQuestions: quiz.questions.length,
      });
      await fetchLeaderboard("around");
    };

    syncResultAndLeaderboard();
  }, [showResult, quiz, didSubmitResult, score]);

  useEffect(() => {
    if (!showResult) {
      setLeaderboard([]);
      setCurrentUserRank(null);
      setHasMoreAbove(false);
      setHasMoreBelow(false);
      setLeaderboardLoading(false);
      setLeaderboardTopLoading(false);
      setLeaderboardMoreLoading(false);
    }
  }, [showResult]);

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

  const handleToggleLike = async () => {
    const nextValue = !isLiked;

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.25,
        duration: 140,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLiked(nextValue);
    setLikeBusy(true);

    try {
      await toggleQuizLike(quizId, nextValue);
    } catch (error) {
      setIsLiked(!nextValue);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleReplayQuiz = () => {
    setCurrent(0);
    setSelected(null);
    setSelectedCorrect(null);
    setScore(0);
    setTimer(initialTimer);
    setShowResult(false);
    setDidSubmitResult(false);
    setLeaderboard([]);
    setCurrentUserRank(null);
    setHasMoreAbove(false);
    setHasMoreBelow(false);
  };

  const renderLeaderboardRow = (item: LeaderboardEntry) => (
    <View
      key={`${item.rank}-${item.userId}`}
      style={[styles.leaderboardRow, item.isCurrentUser && styles.currentUserRow]}
    >
      <View style={[styles.rankBadge, item.rank <= 3 && styles.topRankBadge]}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>

      <Image source={getAvatarSource(item.avatar)} style={styles.leaderboardAvatar} />

      <View style={styles.leaderboardTextWrap}>
        <Text style={styles.leaderboardName} numberOfLines={1}>
          {item.username}
          {item.isCurrentUser ? ` • ${translate("playQuiz.you")}` : ""}
        </Text>
        <Text style={styles.leaderboardMeta}>
          {translate("playQuiz.best_score")}: {item.bestScore}/{quiz.questions.length}
        </Text>
      </View>

      <View style={styles.leaderboardScoreBadge}>
        <Text style={styles.leaderboardScoreText}>{item.bestScore}/{quiz.questions.length}</Text>
      </View>
    </View>
  );

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
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultContainer}>
            <Text style={styles.resultEyebrow}>{translate("playQuiz.completed")}</Text>
            <Text style={styles.resultTitle}>{translate("playQuiz.finished")}</Text>
            <Text style={styles.resultScore}>{translate("playQuiz.score")}: {score}/{quiz.questions.length}</Text>

            

            <TouchableOpacity style={styles.resultButton} onPress={handleReplayQuiz}>
              <Text style={styles.resultButtonText}>{translate("playQuiz.replay")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.likeButton, isLiked && styles.likeButtonActive]}
              onPress={handleToggleLike}
              disabled={likeBusy}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Text style={[styles.likeHeart, isLiked && styles.likeHeartActive]}>
                  {isLiked ? "♥" : "♡"}
                </Text>
              </Animated.View>
              <Text style={[styles.likeButtonText, isLiked && styles.likeButtonTextActive]}>
                {translate(isLiked ? "playQuiz.unlike" : "playQuiz.like")}
              </Text>
            </TouchableOpacity>

            <View style={styles.leaderboardCard}>
              <View style={styles.leaderboardHeader}>
                <Text style={styles.leaderboardTitle}>{translate("playQuiz.leaderboard")}</Text>
                {currentUserRank ? (
                  <Text style={styles.leaderboardPosition}>{translate("playQuiz.position")} #{currentUserRank}</Text>
                ) : null}
              </View>

              {leaderboardLoading ? (
                <View style={styles.leaderboardEmptyState}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.leaderboardHelperText}>{translate("playQuiz.loading_leaderboard")}</Text>
                </View>
              ) : leaderboard.length > 0 ? (
                <ScrollView
                  style={styles.leaderboardList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  onScroll={handleLeaderboardScroll}
                  scrollEventThrottle={16}
                >
                  {leaderboardTopLoading ? <ActivityIndicator size="small" color={theme.primary} style={styles.leaderboardLoader} /> : null}
                  {leaderboard.map((item) => renderLeaderboardRow(item))}
                  {leaderboardMoreLoading ? <ActivityIndicator size="small" color={theme.primary} style={styles.leaderboardLoader} /> : null}
                </ScrollView>
              ) : (
                <View style={styles.leaderboardEmptyState}>
                  <Text style={styles.leaderboardHelperText}>{translate("playQuiz.no_players_yet")}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.resultButton, styles.backResultButton]} onPress={() => navigation.goBack()}>
              <Text style={styles.resultButtonText}>{translate("common.back")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  resultScroll: {
    flex: 1,
  },
  resultScrollContent: {
    paddingTop: 20,
    paddingBottom: 140,
    alignItems: "center",
  },
  resultContainer: {
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    padding: 20,
    width: width - 40,
    alignSelf: "center",
    marginBottom: 24,
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
  leaderboardCard: {
    width: "100%",
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  leaderboardTitle: {
    color: theme.black,
    fontSize: 18,
    fontWeight: "800",
  },
  leaderboardPosition: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: theme.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  leaderboardList: {
    maxHeight: 260,
    width: "100%",
  },
  leaderboardEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  leaderboardHelperText: {
    marginTop: 8,
    color: theme.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  leaderboardLoader: {
    marginVertical: 10,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.surfaceSoft,
    marginBottom: 8,
  },
  currentUserRow: {
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: `${theme.primary}12`,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  topRankBadge: {
    backgroundColor: theme.success,
  },
  rankText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: "800",
  },
  leaderboardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginHorizontal: 10,
  },
  leaderboardTextWrap: {
    flex: 1,
  },
  leaderboardName: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "800",
  },
  leaderboardMeta: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardScoreBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.surface,
  },
  leaderboardScoreText: {
    color: theme.success,
    fontSize: 13,
    fontWeight: "800",
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
    marginBottom: 8,
  },
  likeButton: {
    marginTop: 12,
    backgroundColor: theme.surfaceSoft,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: theme.border,
  },
  likeButtonActive: {
    backgroundColor: `${theme.danger}22`,
    borderColor: theme.danger,
  },
  likeHeart: {
    color: theme.textMuted,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 4,
  },
  likeHeartActive: {
    color: theme.danger,
  },
  likeButtonText: {
    color: theme.black,
    fontSize: 16,
    fontWeight: "700",
  },
  likeButtonTextActive: {
    color: theme.danger,
  },
  resultButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
