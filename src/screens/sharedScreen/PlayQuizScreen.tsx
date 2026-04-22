import React, { useCallback, useEffect, useState, useRef } from "react";
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
import { translate, useTranslationVersion } from "../../services/translateService";
import { getAvatarSource } from "../../utils/avatarOptions";
import { getCountryFlagSource } from "../../services/countryService";
import { getItem, saveItem } from "../../utils/storageService";

const SECONDS_PER_QUESTION = 3;
const DEFAULT_QUIZ_TIMER = 30;
const BONUS_TIME = 0;
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
  avatarUrl?: string;
  country?: {
    key: string;
    name?: string;
    flagUrl?: string | null;
  } | null;
  bestScore: number;
  playCount: number;
  bestTimeSeconds?: number | null;
  isCurrentUser?: boolean;
}

export default function PlayQuizScreen() {
  useTranslationVersion();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { quizId } = route.params;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [bestTimeSeconds, setBestTimeSeconds] = useState<number | null>(null);
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
  const leaderboardScrollRef = useRef<ScrollView | null>(null);
  const leaderboardViewportHeight = useRef(0);
  const hasAutoFocusedCurrentUser = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const mergeLeaderboardEntries = useCallback((currentEntries: LeaderboardEntry[], nextEntries: LeaderboardEntry[]) => {
    const byRank = new Map<number, LeaderboardEntry>();
    [...currentEntries, ...nextEntries].forEach((item) => {
      byRank.set(item.rank, item);
    });

    return Array.from(byRank.values()).sort((a, b) => a.rank - b.rank);
  }, []);

  const applyLeaderboardResponse = useCallback((payload: any, mode: "around" | "top" | "after") => {
    const nextItems: LeaderboardEntry[] = Array.isArray(payload?.data) ? payload.data : [];

    setCurrentUserRank(payload?.currentUserRank ?? null);
    setHasMoreAbove(Boolean(payload?.hasMoreAbove));
    setHasMoreBelow(Boolean(payload?.hasMoreBelow));

    if (mode === "around" && !nextItems.some((item) => item.isCurrentUser)) {
      hasAutoFocusedCurrentUser.current = true;
    }

    setLeaderboard((prev) => (mode === "around" ? nextItems : mergeLeaderboardEntries(prev, nextItems)));
  }, [mergeLeaderboardEntries]);

  const fetchLeaderboard = useCallback(async (mode: "around" | "top" | "after" = "around") => {
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
  }, [quizId, hasMoreAbove, leaderboardTopLoading, hasMoreBelow, leaderboardMoreLoading, leaderboard, applyLeaderboardResponse]);

  const focusCurrentUserRow = (rowY: number, rowHeight: number) => {
    if (hasAutoFocusedCurrentUser.current) {
      return;
    }

    requestAnimationFrame(() => {
      const viewportHeight = leaderboardViewportHeight.current || 260;
      const centeredOffset = rowY - viewportHeight / 2 + rowHeight / 2;

      leaderboardScrollRef.current?.scrollTo({
        y: Math.max(centeredOffset, 0),
        animated: true,
      });
      hasAutoFocusedCurrentUser.current = true;
    });
  };

  const handleLeaderboardScroll = ({ nativeEvent }: any) => {
    if (!hasAutoFocusedCurrentUser.current) {
      return;
    }

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
      const [data, storedUserData] = await Promise.all([
        loadQuizById(quizId),
        getItem<any>("userData"),
      ]);
      const totalTimer = data?.questions?.length ? data.questions.length * SECONDS_PER_QUESTION : (data?.timerSeconds || DEFAULT_QUIZ_TIMER);
      setQuiz(data);
      setIsLiked(Boolean(data?.userStats?.isLiked));
      setCurrentPoints(
        storedUserData?.user ? Number(storedUserData.user.points ?? 0) : null
      );
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
      const computedTimeSpent = Math.max(0, initialTimer - timer);
      setTimeSpent(computedTimeSpent);

      const result = await recordQuizPlay(quiz.id, {
        score,
        totalQuestions: quiz.questions.length,
        timeSpent: computedTimeSpent,
      });

      const updatedPoints = result?.data?.totalPoints;
      const earnedPoints = Number(result?.data?.pointsEarned || 0);
      setPointsEarned(earnedPoints);
      setBestTimeSeconds(result?.data?.bestTimeSeconds ?? computedTimeSpent);

      if (typeof updatedPoints === "number") {
        setCurrentPoints(updatedPoints);
        const storedUserData: any = await getItem("userData");

        if (storedUserData?.user) {
          await saveItem("userData", {
            ...storedUserData,
            user: {
              ...storedUserData.user,
              points: updatedPoints,
            },
          });
        }
      }

      await fetchLeaderboard("around");
    };

    syncResultAndLeaderboard();
  }, [showResult, quiz, didSubmitResult, score, fetchLeaderboard]);

  useEffect(() => {
    if (!showResult) {
      setLeaderboard([]);
      setCurrentUserRank(null);
      setHasMoreAbove(false);
      setHasMoreBelow(false);
      setLeaderboardLoading(false);
      setLeaderboardTopLoading(false);
      setLeaderboardMoreLoading(false);
      leaderboardViewportHeight.current = 0;
      hasAutoFocusedCurrentUser.current = false;
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
    } catch {
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
    setPointsEarned(0);
    setTimeSpent(0);
    setBestTimeSeconds(null);
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
      onLayout={(event) => {
        if (item.isCurrentUser) {
          focusCurrentUserRow(event.nativeEvent.layout.y, event.nativeEvent.layout.height);
        }
      }}
    >
      <View style={[styles.rankBadge, item.rank <= 3 && styles.topRankBadge]}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>

      <Image source={getAvatarSource(item.avatar, null)} style={styles.leaderboardAvatar} />

      {item.country?.key ? (
        <Image source={getCountryFlagSource(null, item.country.key)} style={styles.leaderboardFlag} />
      ) : null}

      <View style={styles.leaderboardTextWrap}>
        <Text style={styles.leaderboardName} numberOfLines={1}>
          {item.username}
          {item.isCurrentUser ? ` • ${translate("playQuiz.you")}` : ""}
        </Text>
        <View style={styles.leaderboardStatsInline}>
          <View style={styles.leaderboardMiniBadge}>
            <Text style={styles.leaderboardMiniBadgeText}>🎯 {item.bestScore}/{quiz.questions.length}</Text>
          </View>
          <View style={[styles.leaderboardMiniBadge, styles.leaderboardTimeBadge]}>
            <Text style={[styles.leaderboardMiniBadgeText, styles.leaderboardTimeBadgeText]}>⏱️ {item.bestTimeSeconds ?? 0}s</Text>
          </View>
        </View>
      </View>

      <View style={styles.leaderboardScoreBadge}>
        <Text style={styles.leaderboardScoreText}>#{item.rank}</Text>
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
          points={currentPoints}
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

            <View style={styles.resultStatsRow}>
              <View style={[styles.resultStatCard, styles.resultScoreCard]}>
                <Text style={styles.resultStatLabel}>🎯 {translate("playQuiz.score")}</Text>
                <Text style={styles.resultScore}>{score}/{quiz.questions.length}</Text>
                <Text style={styles.resultStatHint}>
                  {Math.round((score / Math.max(quiz.questions.length, 1)) * 100)}% success
                </Text>
              </View>

              <View style={[styles.resultStatCard, styles.resultTimeCard]}>
                <Text style={styles.resultStatLabel}>
                  ⏱️ {translate("points.time_spent") === "points.time_spent" ? "Time spent" : translate("points.time_spent")}
                </Text>
                <Text style={styles.resultTime}>{timeSpent}s</Text>
                <Text style={styles.resultStatHint}>
                  {bestTimeSeconds ? `Best ${bestTimeSeconds}s` : "Nice run!"}
                </Text>
              </View>
            </View>

            {pointsEarned > 0 ? (
              <View style={styles.pointsEarnedBadge}>
                <Text style={styles.pointsEarnedText}>{translate("points.earned")}: +{pointsEarned} {translate("points.unit")}</Text>
              </View>
            ) : null}

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
                  ref={leaderboardScrollRef}
                  style={styles.leaderboardList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  onLayout={(event) => {
                    leaderboardViewportHeight.current = event.nativeEvent.layout.height;
                  }}
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


            <TouchableOpacity style={styles.resultButton} onPress={handleReplayQuiz}>
              <Text style={styles.resultButtonText}>{translate("playQuiz.replay")}</Text>
            </TouchableOpacity>

          

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
  resultStatsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  resultStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 104,
  },
  resultScoreCard: {
    backgroundColor: `${theme.success}14`,
    borderColor: `${theme.success}55`,
  },
  resultTimeCard: {
    backgroundColor: `${theme.primary}12`,
    borderColor: `${theme.primary}45`,
  },
  resultStatLabel: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  resultScore: {
    fontSize: 28,
    color: theme.success,
    fontWeight: "900",
    marginBottom: 4,
  },
  resultTime: {
    fontSize: 28,
    color: theme.primary,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
  },
  resultStatHint: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: "700",
    textAlign: "center",
  },
  pointsEarnedBadge: {
    backgroundColor: `${theme.success}18`,
    borderWidth: 1,
    borderColor: `${theme.success}55`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
  },
  pointsEarnedText: {
    color: theme.success,
    fontSize: 14,
    fontWeight: "800",
  },
  leaderboardCard: {
    width: "100%",
    marginTop: 6,
    marginBottom: 2,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
    maxHeight: 200,
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.surfaceSoft,
    marginBottom: 6,
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
    marginLeft: 10,
    marginRight: 8,
  },
  leaderboardFlag: {
    width: 22,
    height: 15,
    borderRadius: 3,
    marginRight: 8,
    backgroundColor: theme.white,
  },
  leaderboardTextWrap: {
    flex: 1,
  },
  leaderboardName: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  leaderboardStatsInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  leaderboardMiniBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: `${theme.success}16`,
    borderWidth: 1,
    borderColor: `${theme.success}44`,
  },
  leaderboardTimeBadge: {
    backgroundColor: `${theme.primary}12`,
    borderColor: `${theme.primary}44`,
  },
  leaderboardMiniBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.success,
  },
  leaderboardTimeBadgeText: {
    color: theme.primary,
  },
  leaderboardScoreBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    minWidth: 48,
    alignItems: "center",
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
