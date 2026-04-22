import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppDialog from "../../components/AppDialog";
import GlassHeader from "../../components/GlassHeader";
import useAppAlert from "../../components/useAppAlert";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";
import { translate, useTranslationVersion, getCurrentLanguage } from "../../services/translateService";
import { getItem } from "../../utils/storageService";
import { getCountryFlagUrl } from "../../services/countryService";
import { getAvatarSource } from "../../utils/avatarOptions";
import {
  MultiplayerQuestion,
  PresenterState,
  MultiplayerRoomState,
  connectMultiplayerSocket,
  buzzMultiplayer,
  disconnectMultiplayerSocket,
  getMultiplayerSocket,
  getPresenterImageUrl,
  joinMultiplayerMatchmaking,
  leaveMultiplayerRoom,
  submitMultiplayerThemeVote,
  submitMultiplayerAnswer,
} from "../../services/multiplayerService";

type StoredUserData = {
  token: string;
  user?: {
    id: number;
    username?: string;
  };
};

const EMPTY_PLAYER_SLOTS = Array.from({ length: 2 }, (_, index) => ({
  id: `empty-${index}`,
}));

const PLAYER_SLOT_LAYOUT = {
  2: ["topLeft", "topRight"],
} as const;

const THEME_COUNTDOWN_STEPS = ["3", "2", "1", "0", "START"] as const;
const THEME_COUNTDOWN_STEP_MS = 1000;
const THEME_COUNTDOWN_END_HOLD_MS = 1000;
const BUZZ_SPAM_WINDOW_MS = 1200;
const BUZZ_SPAM_MAX_TAPS = 5;
const BUZZ_SPAM_BLOCK_MS = 5000;
type ThemeCountdownStep = typeof THEME_COUNTDOWN_STEPS[number];
type QuestionOpenPayload = {
  presenterState?: PresenterState;
  question: MultiplayerQuestion;
  questionIndex: number;
  totalQuestions: number;
};

type AnswerResultPayload = {
  userId?: number | null;
  answerId?: number | null;
  result: string;
  correctAnswerId?: number | null;
};

type GameFinishedPayload = {
  players?: MultiplayerRoomState["players"];
};

type WinnerPlayer = {
  userId?: number;
  username?: string;
  avatar?: string;
  score?: number;
  isVirtual?: boolean;
  countryId?: number | null;
  country?: {
    key?: string;
    flagUrl?: string | null;
  } | null;
};

export default function MultiplayerQuizScreen({ navigation }: any) {
  useTranslationVersion();
  const translateWithParams = (key: string, params?: Record<string, string | number>) => {
    let value = translate(key);
    if (params) {
      Object.entries(params).forEach(([name, paramValue]) => {
        value = value.replace(new RegExp(`\\{${name}\\}`, "g"), String(paramValue));
      });
    }

    return value;
  };

  const [joining, setJoining] = useState(false);
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<MultiplayerQuestion | null>(null);
  const [presenterState, setPresenterState] = useState<PresenterState>("idle");
  const [statusText, setStatusText] = useState(translate("multiplayer.initial_prompt"));
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentSocketId, setCurrentSocketId] = useState<string>("");
  const [submittingAnswerId, setSubmittingAnswerId] = useState<number | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [revealedCorrectAnswerId, setRevealedCorrectAnswerId] = useState<number | null>(null);
  const [answerRevealResult, setAnswerRevealResult] = useState<string | null>(null);
  const [presenterImageFailed, setPresenterImageFailed] = useState(false);
  const [themeCountdownStep, setThemeCountdownStep] = useState<ThemeCountdownStep | null>(null);
  const [winnerDialogVisible, setWinnerDialogVisible] = useState(false);
  const [winnerPlayer, setWinnerPlayer] = useState<WinnerPlayer | null>(null);
  const [activeResponderName, setActiveResponderName] = useState<string | null>(null);
  const [buzzBlockedUntil, setBuzzBlockedUntil] = useState<number | null>(null);
  const [buzzBlockSecondsLeft, setBuzzBlockSecondsLeft] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const themeCountdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const buzzTapTimesRef = useRef<number[]>([]);
  const themeCountdownRunningRef = useRef(false);
  const pendingQuestionOpenRef = useRef<QuestionOpenPayload | null>(null);
  const roomStateRef = useRef<MultiplayerRoomState | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const themeCountdownScale = useRef(new Animated.Value(0.5)).current;
  const themeCountdownOpacity = useRef(new Animated.Value(0)).current;
  const { showAppAlert, appAlertDialog } = useAppAlert(translate("common.ok") === "common.ok" ? "OK" : translate("common.ok"));

  const clearAnswerReveal = () => {
    setSelectedAnswerId(null);
    setRevealedCorrectAnswerId(null);
    setAnswerRevealResult(null);
  };

  const resolvePlayerFlagSource = (player?: {
    countryId?: number | string | null;
    country_id?: number | string | null;
    country?: { key?: string; flagUrl?: string | null } | null;
  } | null) => {
    if (!player) {
      return null;
    }

    const flagUrl = getCountryFlagUrl(player.country?.flagUrl || null, player.country?.key || null);
    return flagUrl ? { uri: flagUrl } : null;
  };

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      const movedToBackground = previousState === "active" && nextAppState !== "active";
      if (!movedToBackground) {
        return;
      }

      if (!roomStateRef.current?.roomId) {
        return;
      }

      stopThemeCountdown();
      pendingQuestionOpenRef.current = null;
      clearAnswerReveal();
      leaveMultiplayerRoom();
      disconnectMultiplayerSocket();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!buzzBlockedUntil) {
      setBuzzBlockSecondsLeft(0);
      return;
    }

    const updateBuzzBlockCountdown = () => {
      const remainingMs = buzzBlockedUntil - Date.now();

      if (remainingMs <= 0) {
        setBuzzBlockedUntil(null);
        setBuzzBlockSecondsLeft(0);
        buzzTapTimesRef.current = [];
        return;
      }

      setBuzzBlockSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    updateBuzzBlockCountdown();
    const intervalId = setInterval(updateBuzzBlockCountdown, 200);
    return () => clearInterval(intervalId);
  }, [buzzBlockedUntil]);

  const resolveWinnerFromRoom = (snapshot: MultiplayerRoomState | null): WinnerPlayer | null => {
    const players = snapshot?.players || [];
    if (!players.length) {
      return null;
    }

    const sorted = [...players].sort((a: any, b: any) => {
      const scoreDiff = Number(b?.score || 0) - Number(a?.score || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const aName = String(a?.username || "").toLowerCase();
      const bName = String(b?.username || "").toLowerCase();
      return aName.localeCompare(bName);
    });

    return sorted[0] || null;
  };

  const showWinnerDialog = (players?: MultiplayerRoomState["players"]) => {
    const winner = players?.length
      ? resolveWinnerFromRoom({ players } as MultiplayerRoomState)
      : resolveWinnerFromRoom(roomStateRef.current);
    setWinnerPlayer(winner);
    setWinnerDialogVisible(true);
  };

  const applyQuestionOpenPayload = (payload: QuestionOpenPayload) => {
    clearAnswerReveal();
    setActiveResponderName(null);
    setPresenterState(payload.presenterState || "idle");
    setCurrentQuestion(payload.question);
    setDeadlineAt(null);
    setSubmittingAnswerId(null);
    setStatusText(translateWithParams("multiplayer.question_count", {
      index: payload.questionIndex,
      total: payload.totalQuestions,
    }));
  };

  const clearThemeCountdownTimers = () => {
    themeCountdownTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    themeCountdownTimersRef.current = [];
  };

  const stopThemeCountdown = () => {
    clearThemeCountdownTimers();
    themeCountdownRunningRef.current = false;
    setThemeCountdownStep(null);
    themeCountdownScale.stopAnimation();
    themeCountdownOpacity.stopAnimation();
    themeCountdownScale.setValue(0.5);
    themeCountdownOpacity.setValue(0);
  };

  const animateThemeCountdownStep = (isStartStep: boolean) => {
    themeCountdownScale.stopAnimation();
    themeCountdownOpacity.stopAnimation();

    themeCountdownScale.setValue(isStartStep ? 0.62 : 0.5);
    themeCountdownOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(themeCountdownOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(themeCountdownScale, {
          toValue: 1.08,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(themeCountdownOpacity, {
          toValue: isStartStep ? 0.92 : 0.2,
          duration: isStartStep ? 140 : 110,
          useNativeDriver: true,
        }),
        Animated.timing(themeCountdownScale, {
          toValue: isStartStep ? 1.04 : 0.84,
          duration: isStartStep ? 140 : 110,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const startThemeCountdown = () => {
    stopThemeCountdown();
    pendingQuestionOpenRef.current = null;
    themeCountdownRunningRef.current = true;

    THEME_COUNTDOWN_STEPS.forEach((step, index) => {
      const timerId = setTimeout(() => {
        if (!themeCountdownRunningRef.current) {
          return;
        }

        setThemeCountdownStep(step);
        animateThemeCountdownStep(step === "START");
      }, index * THEME_COUNTDOWN_STEP_MS);

      themeCountdownTimersRef.current.push(timerId);
    });

    const hideTimerId = setTimeout(() => {
      if (!themeCountdownRunningRef.current) {
        return;
      }

      stopThemeCountdown();

      if (pendingQuestionOpenRef.current) {
        const deferredPayload = pendingQuestionOpenRef.current;
        pendingQuestionOpenRef.current = null;
        applyQuestionOpenPayload(deferredPayload);
      }
    }, THEME_COUNTDOWN_STEPS.length * THEME_COUNTDOWN_STEP_MS + THEME_COUNTDOWN_END_HOLD_MS);

    themeCountdownTimersRef.current.push(hideTimerId);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const stored = await getItem<StoredUserData>("userData");
        setCurrentUserId(typeof stored?.user?.id === "number" ? stored.user.id : null);
      } catch (error) {
        showAppAlert(translate("common.error"), translate("themeBrowse.empty"));
      }

    };

    loadInitialData();

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      stopThemeCountdown();
      pendingQuestionOpenRef.current = null;
      leaveMultiplayerRoom();
      disconnectMultiplayerSocket();
    };
  }, []);

  useEffect(() => {
    if (!deadlineAt) {
      setTimeLeft(0);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const updateTimeLeft = () => {
      setTimeLeft(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));
    };

    updateTimeLeft();

    timeoutRef.current = setInterval(updateTimeLeft, 250);
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [deadlineAt]);

  const handleBack = () => {
    stopThemeCountdown();
    pendingQuestionOpenRef.current = null;
    clearAnswerReveal();
    setWinnerDialogVisible(false);
    leaveMultiplayerRoom();
    disconnectMultiplayerSocket();
    navigation.goBack();
  };

  const attachSocketListeners = () => {
    const socket = getMultiplayerSocket();
    if (!socket) {
      return;
    }

    socket.removeAllListeners("multiplayer:room_state");
    socket.removeAllListeners("multiplayer:match_found");
    socket.removeAllListeners("question_open");
    socket.removeAllListeners("locked");
    socket.removeAllListeners("buzzer_reset");
    socket.removeAllListeners("answer_result");
    socket.removeAllListeners("score_updated");
    socket.removeAllListeners("game_finished");
    socket.removeAllListeners("multiplayer:theme_options");
    socket.removeAllListeners("multiplayer:theme_selected");
    socket.removeAllListeners("multiplayer:error");

    socket.on("multiplayer:room_state", (payload: MultiplayerRoomState) => {
      setRoomState(payload);
      setPresenterState(payload.presenterState || "idle");
      setDeadlineAt(payload.answerDeadlineAt || null);

      if (payload.phase === "matchmaking") {
        const waitingCount = payload.waitingCount || 1;
        const requiredCount = payload.requiredCount || 2;
        setStatusText(translateWithParams("multiplayer.waiting_for_players", {
          waiting: waitingCount,
          required: requiredCount,
        }));
      } else if (payload.phase === "theme-voting") {
        setStatusText(translate("multiplayer.players_found"));
      } else if (payload.phase === "question-open") {
        setStatusText(translate("multiplayer.phase_question_open"));
      } else if (payload.phase === "buzz-locked") {
        setStatusText(translate("multiplayer.phase_buzz_locked"));
      } else if (payload.phase === "finished") {
        setStatusText(translate("multiplayer.phase_finished"));
      }
    });

    socket.on("multiplayer:match_found", () => {
      setStatusText(translate("multiplayer.match_found"));
      setJoining(false);
    });

    socket.on("multiplayer:theme_options", (payload: { voteDeadlineAt?: number; themes: Array<{ id: number; name: string }> }) => {
      setRoomState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          phase: "theme-voting",
          themeOptions: payload.themes,
          themeVoteDeadlineAt: payload.voteDeadlineAt || null,
        };
      });
      setStatusText(translate("multiplayer.vote_theme_prompt"));
    });

    socket.on("multiplayer:theme_selected", (payload: { themeName?: string }) => {
      setStatusText(translateWithParams("multiplayer.theme_selected", {
        theme: payload?.themeName || translate("multiplayer.theme_generic"),
      }));
      startThemeCountdown();
    });

    socket.on("question_open", (payload: QuestionOpenPayload) => {
      if (themeCountdownRunningRef.current) {
        pendingQuestionOpenRef.current = payload;
        return;
      }

      applyQuestionOpenPayload(payload);
    });

    socket.on("locked", (payload: { lockedSocketId: string; lockedUserId?: number; answerDeadlineAt?: number; presenterState?: "idle" | "speaking" }) => {
      setPresenterState(payload.presenterState || "speaking");
      setDeadlineAt(payload.answerDeadlineAt || null);
      setRoomState((current) => current ? { ...current, lockedSocketId: payload.lockedSocketId } : current);

      const responderFromSocket = roomStateRef.current?.players?.find((item) => item.socketId === payload.lockedSocketId);
      const responderFromUser = typeof payload.lockedUserId === "number"
        ? roomStateRef.current?.players?.find((item) => item.userId === payload.lockedUserId)
        : null;
      setActiveResponderName(
        responderFromSocket?.username || responderFromUser?.username || translate("multiplayer.player_generic")
      );

      if (payload.lockedSocketId === socket.id) {
        setStatusText(translate("multiplayer.you_buzzed_first"));
      } else {
        setStatusText(translate("multiplayer.other_buzzed_first"));
      }
    });

    socket.on("buzzer_reset", () => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setSubmittingAnswerId(null);
      clearAnswerReveal();
      setActiveResponderName(null);
      setRoomState((current) => current ? { ...current, lockedSocketId: null } : current);
      setStatusText(translate("multiplayer.buzzer_reset"));
    });

    socket.on("answer_result", (payload: AnswerResultPayload) => {
      setDeadlineAt(null);
      setSubmittingAnswerId(null);
      setRevealedCorrectAnswerId(payload.correctAnswerId ?? null);
      setAnswerRevealResult(payload.result);
      setSelectedAnswerId(payload.answerId ?? null);

      if (payload.result === "correct") {
        setPresenterState("correct");
      } else if (payload.result === "wrong" || payload.result === "timeout" || payload.result === "disconnect-timeout" || payload.result === "reveal") {
        setPresenterState("wrong");
      } else {
        setPresenterState("idle");
      }

      setRoomState((current) => current ? { ...current, phase: "answer-reveal", lockedSocketId: null, answerDeadlineAt: null } : current);

      if (payload.result === "correct") {
        setStatusText(
          payload.userId === currentUserId
            ? translate("multiplayer.you_answered_correct")
            : translate("multiplayer.player_answered_correct")
        );
      } else if (payload.result === "wrong" || payload.result === "timeout" || payload.result === "disconnect-timeout") {
        setStatusText(
          payload.userId === currentUserId
            ? translate("multiplayer.you_answered_wrong")
            : translate("multiplayer.player_answered_wrong")
        );
      } else if (payload.result === "reveal") {
        setStatusText(translate("multiplayer.no_players_left"));
      }
    });

    socket.on("score_updated", (payload: { players: MultiplayerRoomState["players"] }) => {
      setRoomState((current) => current ? { ...current, players: payload.players } : current);
    });

    socket.on("game_finished", (payload: GameFinishedPayload) => {
      setPresenterState("idle");
      setDeadlineAt(null);
      if (payload?.players?.length) {
        setRoomState((current) => current ? { ...current, players: payload.players || [] } : current);
      }
      setStatusText(translate("multiplayer.game_finished"));
      showWinnerDialog(payload?.players);
    });

    socket.on("multiplayer:error", (payload: { message?: string }) => {
      const message = payload?.message || translate("multiplayer.error_continue");
      stopThemeCountdown();
      pendingQuestionOpenRef.current = null;
      clearAnswerReveal();
      setJoining(false);
      setStatusText(message);

      const shouldGoBackAfterClose = /timed out|no player found|no players found/i.test(message);
      if (shouldGoBackAfterClose) {
        showAppAlert(translate("common.error"), message, () => {
          handleBack();
        });
        return;
      }

      showAppAlert(translate("common.error"), message);
    });
  };

  const startMatchmaking = async () => {
    if (joining || roomState?.phase === "matchmaking") {
      return;
    }

    const storedUserData = await getItem<StoredUserData>("userData");
    if (!storedUserData?.token) {
      showAppAlert(translate("common.error"), translate("multiplayer.error_not_logged_in"));
      return;
    }

    try {
      setJoining(true);
      const selectedLanguage = await getCurrentLanguage();
      const socket = await connectMultiplayerSocket(storedUserData.token);
      setCurrentSocketId(socket.id || "");
      attachSocketListeners();
      joinMultiplayerMatchmaking({ language: selectedLanguage });
      setStatusText(translate("multiplayer.joining_matchmaking"));
    } catch (error: any) {
      setJoining(false);
      showAppAlert(translate("common.error"), error?.message || translate("multiplayer.error_connection"));
    }
  };

  const currentPlayer = useMemo(
    () => roomState?.players?.find((player) => player.userId === currentUserId) || null,
    [roomState, currentUserId]
  );

  const canBuzz = Boolean(
    roomState?.roomId &&
    roomState.phase === "question-open" &&
    currentQuestion &&
    !roomState.lockedSocketId &&
    currentPlayer?.hasAnsweredCurrent !== true
  );

  const canAnswer = Boolean(
    roomState?.roomId &&
    roomState.lockedSocketId &&
    roomState.lockedSocketId === currentSocketId &&
    currentQuestion
  );

  const canViewResponses = Boolean(
    roomState?.roomId &&
    (roomState.phase === "buzz-locked" || roomState.phase === "answer-reveal") &&
    currentQuestion
  );

  const lockedPlayer = useMemo(
    () => roomState?.players?.find((player) => player.socketId === roomState?.lockedSocketId) || null,
    [roomState]
  );

  const myThemeVoteId = useMemo(() => {
    const votes = roomState?.themeVotes || [];
    const myVote = votes.find((item) => item.socketId === currentSocketId);
    return myVote?.themeId || null;
  }, [roomState, currentSocketId]);

  const canVoteTheme = Boolean(roomState?.roomId && roomState?.phase === "theme-voting");

  const inGamePhases = new Set(["question-open", "buzz-locked", "answer-reveal", "finished"]);
  const isGameplay = Boolean(roomState?.roomId && roomState?.phase && inGamePhases.has(roomState.phase));

  const displayedPlayers = useMemo(() => {
    const activePlayers = roomState?.players || [];
    return [...activePlayers, ...EMPTY_PLAYER_SLOTS].slice(0, 2);
  }, [roomState]);

  const positionedPlayers = useMemo(() => {
    const activePlayers = roomState?.players || [];
    const count = 2 as const;
    const layout = PLAYER_SLOT_LAYOUT[count];

    return activePlayers.slice(0, layout.length).map((player, index) => ({
      player,
      slot: layout[index],
    }));
  }, [roomState]);

  const isRevealPhase = roomState?.phase === "answer-reveal";
  const isBuzzTemporarilyBlocked = buzzBlockSecondsLeft > 0;

  const handleBuzzPress = () => {
    if (!roomState?.roomId || !canBuzz) {
      return;
    }

    const now = Date.now();
    if (buzzBlockedUntil && now < buzzBlockedUntil) {
      return;
    }

    const recentTaps = buzzTapTimesRef.current.filter((timestamp) => now - timestamp <= BUZZ_SPAM_WINDOW_MS);
    recentTaps.push(now);
    buzzTapTimesRef.current = recentTaps;

    if (recentTaps.length >= BUZZ_SPAM_MAX_TAPS) {
      setBuzzBlockedUntil(now + BUZZ_SPAM_BLOCK_MS);
      return;
    }

    buzzMultiplayer(roomState.roomId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("home.multiplayer_title")}
          subtitle={statusText}
          onBackPress={handleBack}
        />
      </View>

      {!isGameplay ? (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canVoteTheme ? (
          <View style={[styles.playersCard, commonStyles.softCardShadow]}>
            <Text style={styles.sectionTitle}>{translate("multiplayer.vote_theme_label")}</Text>
            <View style={styles.themeVoteList}>
              {(roomState?.themeOptions || []).map((item) => {
                const isSelected = myThemeVoteId === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.themeVoteButton, isSelected && styles.themeVoteButtonSelected]}
                    onPress={() => submitMultiplayerThemeVote({ roomId: roomState?.roomId, themeId: item.id })}
                    disabled={Boolean(myThemeVoteId)}
                  >
                    <Text style={[styles.themeVoteButtonText, isSelected && styles.themeVoteButtonTextSelected]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <>
            {roomState ? (
              <View style={styles.presenterWrap}>
                <Image
                  source={{ uri: getPresenterImageUrl(presenterState) }}
                  style={styles.presenterImage}
                  resizeMode="contain"
                  onError={() => setPresenterImageFailed(true)}
                />
                {presenterImageFailed ? <Text style={styles.presenterFallback}>{translate("multiplayer.presenter_fallback")}</Text> : null}
                {currentQuestion ? <Text style={styles.questionText}>{currentQuestion.questionText}</Text> : null}
                {deadlineAt ? <Text style={styles.timerText}>{timeLeft}s</Text> : null}
              </View>
            ) : null}

            <View style={[styles.playersCard, commonStyles.softCardShadow]}>
              <Text style={styles.sectionTitle}>{translate("multiplayer.players_section")}</Text>
              <View style={styles.playersGrid}>
                {displayedPlayers.map((player: any) => {
                  const isRealPlayer = Boolean(player.userId);
                  const flagSource = isRealPlayer ? resolvePlayerFlagSource(player) : null;

                  return (
                    <View
                      key={String(player.userId || player.id)}
                      style={[styles.playerSlot, !isRealPlayer && styles.playerSlotEmpty]}
                    >
                      {isRealPlayer ? (
                        <>
                          <Image source={getAvatarSource(player.avatar, null)} style={styles.playerAvatar} />
                          {flagSource ? (
                            <Image source={flagSource} style={styles.playerFlag} />
                          ) : null}
                          <View style={styles.playerIdentityRow}>
                            <Text style={styles.playerName} numberOfLines={1}>{player.username}</Text>
                            {player.isVirtual ? (
                              <View style={styles.botBadge}>
                                <Text style={styles.botBadgeText}>{translate("multiplayer.bot_badge")}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.playerScore}>{player.score} pts</Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.emptyAvatar} />
                          <Text style={styles.emptyText}>{translate("multiplayer.waiting_status")}</Text>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
              {!roomState ? (
                <View style={styles.playersActionWrap}>
                  <TouchableOpacity
                    style={[styles.primaryButton, joining && styles.buttonDisabled]}
                    onPress={startMatchmaking}
                    disabled={joining}
                  >
                    {joining ? <ActivityIndicator color={theme.white} /> : <Text style={styles.primaryButtonText}>{translate("multiplayer.start_button")}</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </>
        )}

      </ScrollView>
      ) : (
        <View style={styles.gameArena}>
          {positionedPlayers.map(({ player, slot }) => {
            const isBuzzed = roomState?.phase === "buzz-locked" && roomState?.lockedSocketId === player.socketId;
            const flagSource = resolvePlayerFlagSource(player);
            const slotStyle =
              slot === "topLeft"
                ? styles.topLeft
                : slot === "topRight"
                  ? styles.topRight
                  : slot === "bottomLeft"
                    ? styles.bottomLeft
                    : slot === "bottomRight"
                      ? styles.bottomRight
                      : styles.bottomCenter;

            return (
              <View
                key={String(player.userId || player.socketId)}
                style={[styles.playerCornerCard, slotStyle, isBuzzed && styles.playerCornerCardBuzzed, commonStyles.softCardShadow]}
              >
                <Image source={getAvatarSource(player.avatar, null)} style={styles.cornerAvatar} />
                {flagSource ? (
                  <Image source={flagSource} style={styles.cornerFlag} />
                ) : null}
                <Text style={styles.cornerName} numberOfLines={1}>{player.username}</Text>
                <Text style={styles.cornerPts}>{player.score} pts</Text>
              </View>
            );
          })}

          <View style={[styles.centerGameCard, commonStyles.softCardShadow]}>
            <View style={styles.cardGlowA} />
            <View style={styles.cardGlowB} />
            {canViewResponses && currentQuestion ? (
              <View style={styles.centerStageContent}>
                <View style={styles.questionHero}>
                  <View style={styles.questionEyebrowRow}>
                    <Text style={styles.questionEyebrow}>{translate("multiplayer.live_question_label")}</Text>
                    {roomState?.phase === "buzz-locked" && activeResponderName ? (
                      <View style={styles.responderBadge}>
                        <View style={styles.responderDot} />
                        <Text style={styles.responderBadgeText} numberOfLines={1}>
                          {translateWithParams("multiplayer.responder_now", { player: activeResponderName })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.centerGameQuestion}>{currentQuestion.questionText}</Text>
                </View>
                <View style={styles.answersGrid}>
                  {/* Only show selected answer after player has answered */}
                  {selectedAnswerId !== null && isRevealPhase ? (
                    currentQuestion.answers
                      .filter((answer) => answer.id === selectedAnswerId)
                      .map((answer) => (
                        <View
                          key={answer.id}
                          style={[
                            styles.answerButton,
                            revealedCorrectAnswerId === answer.id && styles.answerButtonCorrect,
                            selectedAnswerId === answer.id && answerRevealResult !== "correct" && revealedCorrectAnswerId !== answer.id && styles.answerButtonWrong,
                          ]}
                        >
                          <Text
                            style={[
                              styles.answerButtonText,
                              (revealedCorrectAnswerId === answer.id || (selectedAnswerId === answer.id && answerRevealResult !== "correct" && revealedCorrectAnswerId !== answer.id)) && styles.answerButtonTextInverted,
                            ]}
                          >
                            {answer.answerText}
                          </Text>
                        </View>
                      ))
                  ) : (
                    currentQuestion.answers.map((answer) => (
                      <TouchableOpacity
                        key={answer.id}
                        style={[
                          styles.answerButton,
                          submittingAnswerId === answer.id && styles.answerButtonActive,
                        ]}
                        disabled={submittingAnswerId !== null || isRevealPhase || !canAnswer}
                        onPress={() => {
                          setSubmittingAnswerId(answer.id);
                          setSelectedAnswerId(answer.id);
                          submitMultiplayerAnswer({ roomId: roomState?.roomId, questionId: currentQuestion.id, answerId: answer.id });
                        }}
                      >
                        <Text style={styles.answerButtonText}>{answer.answerText}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
                {isRevealPhase ? (
                  <Text style={styles.readonlyHint}>
                    {answerRevealResult === "correct"
                      ? translate("multiplayer.reveal_correct")
                      : translate("multiplayer.reveal_result")}
                  </Text>
                ) : !canAnswer ? (
                  <Text style={styles.readonlyHint}>
                    {translateWithParams("multiplayer.waiting_for_answer", {
                      player: lockedPlayer?.username || translate("multiplayer.player_generic"),
                    })}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.centerStageContent}>
                <Image
                  source={{ uri: getPresenterImageUrl(presenterState) }}
                  style={styles.presenterImageGame}
                  resizeMode="contain"
                  onError={() => setPresenterImageFailed(true)}
                />
                {presenterImageFailed ? <Text style={styles.presenterFallback}>{translate("multiplayer.presenter_fallback")}</Text> : null}
                <View style={styles.questionHero}>
                  <Text style={styles.questionEyebrow}>{translate("multiplayer.round_question_label")}</Text>
                  {currentQuestion ? (
                    <Text style={styles.centerGameQuestion}>{currentQuestion.questionText}</Text>
                  ) : (
                    <Text style={styles.centerGameQuestion}>{translate("multiplayer.get_ready")}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.bigBuzzButton, (!canBuzz || isBuzzTemporarilyBlocked) && styles.buttonDisabled]}
                  onPress={handleBuzzPress}
                  disabled={!canBuzz || isBuzzTemporarilyBlocked}
                >
                  <Text style={styles.bigBuzzButtonText}>
                    {isBuzzTemporarilyBlocked
                      ? `${translate("common.wait")}... ${buzzBlockSecondsLeft}s`
                      : translate("multiplayer.buzz_button")}
                  </Text>
                </TouchableOpacity>
                {deadlineAt ? <Text style={styles.timerText}>{timeLeft}s</Text> : null}
              </View>
            )}
          </View>
        </View>
      )}

      {themeCountdownStep ? (
        <View style={styles.themeCountdownOverlay} pointerEvents="none">
          <View style={styles.themeCountdownGlowOuter} />
          <View style={styles.themeCountdownGlowInner} />
          <Animated.View
            style={[
              styles.themeCountdownBadge,
              themeCountdownStep === "START" && styles.themeCountdownBadgeStart,
              {
                opacity: themeCountdownOpacity,
                transform: [{ scale: themeCountdownScale }],
              },
            ]}
          >
            <Text
              style={[
                styles.themeCountdownText,
                themeCountdownStep === "START" && styles.themeCountdownStartText,
              ]}
            >
              {themeCountdownStep}
            </Text>
          </Animated.View>
        </View>
      ) : null}

      <AppDialog
        visible={winnerDialogVisible}
        title={translate("multiplayer.winner_dialog_title")}
        subtitle={translate("multiplayer.winner_dialog_subtitle")}
        onClose={handleBack}
      >
        {(() => {
          const winnerFlagSource = resolvePlayerFlagSource(winnerPlayer);

          return (
        <View style={styles.winnerDialogWrap}>
          <View style={styles.winnerPresenterBadge}>
            <Image
              source={{ uri: getPresenterImageUrl("idle") }}
              style={styles.winnerPresenterImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.winnerCard}>
            <Image
              source={getAvatarSource(winnerPlayer?.avatar, null)}
              style={styles.winnerAvatar}
            />

            {winnerFlagSource ? (
              <Image
                source={winnerFlagSource}
                style={styles.winnerFlag}
              />
            ) : null}

            <Text style={styles.winnerName} numberOfLines={1}>
              {winnerPlayer?.username || translate("multiplayer.player_generic")}
            </Text>

            <Text style={styles.winnerPts}>
              {Number(winnerPlayer?.score || 0)} pts
            </Text>
          </View>

          <TouchableOpacity style={styles.winnerBackButton} onPress={handleBack}>
            <Text style={styles.winnerBackButtonText}>{translate("common.back")}</Text>
          </TouchableOpacity>
        </View>
          );
        })()}
      </AppDialog>

      {appAlertDialog}
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
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 42,
  },
  gameArena: {
    flex: 1,
    position: "relative",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
  },
  centerGameCard: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    marginTop: 112,
    marginBottom: 28,
    marginHorizontal: 0,
    width: "100%",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  centerStageContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 2,
  },
  cardGlowA: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#d7f4ff",
    opacity: 0.45,
    zIndex: 0,
  },
  cardGlowB: {
    position: "absolute",
    bottom: -80,
    left: -50,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#ffe7f1",
    opacity: 0.4,
    zIndex: 0,
  },
  questionHero: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbe8ff",
    backgroundColor: "#f8fbff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  questionEyebrow: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  questionEyebrowRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  responderBadge: {
    maxWidth: "62%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#c8ffe8",
    backgroundColor: "#e9fbf6",
  },
  responderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  responderBadgeText: {
    color: "#0d7f57",
    fontSize: 11,
    fontWeight: "900",
  },
  centerGameTitle: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  centerGameQuestion: {
    color: theme.black,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 29,
  },
  presenterImageGame: {
    width: 180,
    height: 130,
  },
  bigBuzzButton: {
    minWidth: 220,
    minHeight: 72,
    borderRadius: 999,
    backgroundColor: "#f1415a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: "#d22b45",
  },
  bigBuzzButtonText: {
    color: theme.white,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2,
  },
  readonlyHint: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  playerCornerCard: {
    position: "absolute",
    width: 122,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    zIndex: 5,
  },
  playerCornerCardBuzzed: {
    backgroundColor: "#e9fbf6",
    borderColor: theme.success,
  },
  topLeft: {
    top: 10,
    left: 8,
  },
  topRight: {
    top: 10,
    right: 8,
  },
  bottomLeft: {
    bottom: 20,
    left: 8,
  },
  bottomRight: {
    bottom: 20,
    right: 8,
  },
  bottomCenter: {
    bottom: 20,
    left: "50%",
    marginLeft: -68,
  },
  cornerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 3,
  },
  cornerFlag: {
    width: 20,
    height: 14,
    borderRadius: 3,
    marginBottom: 3,
    backgroundColor: theme.white,
  },
  cornerName: {
    color: theme.black,
    fontSize: 11,
    fontWeight: "800",
  },
  cornerPts: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  presenterWrap: {
    alignItems: "center",
  },
  presenterImage: {
    width: 220,
    height: 180,
  },
  presenterFallback: {
    color: theme.primary,
    fontWeight: "800",
    fontSize: 18,
    marginTop: 4,
  },
  questionText: {
    color: theme.black,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },
  timerText: {
    color: theme.danger,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  playersCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  playersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  playersActionWrap: {
    marginTop: 14,
  },
  themeVoteWrap: {
    marginTop: 16,
  },
  themeVoteList: {
    gap: 10,
  },
  themeVoteButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceSoft,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  themeVoteButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: "#efeaff",
  },
  themeVoteButtonText: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  themeVoteButtonTextSelected: {
    color: theme.primary,
  },
  playerSlot: {
    width: "47%",
    backgroundColor: theme.surfaceSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  playerSlotEmpty: {
    justifyContent: "center",
    minHeight: 150,
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 10,
  },
  playerFlag: {
    width: 26,
    height: 18,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: theme.white,
  },
  playerName: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  playerIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  botBadge: {
    backgroundColor: "#ffe7f1",
    borderColor: "#ffc4da",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  botBadgeText: {
    color: theme.secondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  playerScore: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.placeholder,
    marginBottom: 12,
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionTitle: {
    color: theme.black,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  matchmakingCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  themeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceSoft,
  },
  themeChipSelected: {
    borderColor: theme.primary,
    backgroundColor: "#efeaff",
  },
  themeChipText: {
    color: theme.black,
    fontSize: 14,
    fontWeight: "700",
  },
  themeChipTextSelected: {
    color: theme.primary,
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
  },
  buzzButton: {
    minHeight: 76,
    borderRadius: 24,
    backgroundColor: theme.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  buzzButtonText: {
    color: theme.white,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  answersCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
  },
  answersGrid: {
    width: "100%",
    gap: 10,
  },
  answerButton: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe5ff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  answerButtonActive: {
    borderColor: theme.primary,
    backgroundColor: "#efeaff",
  },
  answerButtonCorrect: {
    borderColor: theme.success,
    backgroundColor: theme.success,
  },
  answerButtonWrong: {
    borderColor: theme.danger,
    backgroundColor: theme.danger,
  },
  answerButtonText: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  answerButtonTextInverted: {
    color: theme.white,
  },
  themeCountdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9,13,30,0.46)",
    zIndex: 120,
    elevation: 40,
  },
  themeCountdownGlowOuter: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,70,70,0.18)",
  },
  themeCountdownGlowInner: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  themeCountdownBadge: {
    minWidth: 180,
    minHeight: 180,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "rgba(18,24,56,0.75)",
    paddingHorizontal: 18,
  },
  themeCountdownBadgeStart: {
    minWidth: 260,
    minHeight: 180,
    backgroundColor: "rgba(200,10,10,0.9)",
    borderColor: "rgba(255,236,236,0.95)",
  },
  themeCountdownText: {
    color: theme.white,
    fontSize: 96,
    fontWeight: "900",
    lineHeight: 102,
    textAlign: "center",
  },
  themeCountdownStartText: {
    color: "#ff1d1d",
    fontSize: 66,
    letterSpacing: 2,
    lineHeight: 74,
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  winnerDialogWrap: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  winnerPresenterBadge: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbe8ff",
    backgroundColor: "#f8fbff",
    alignItems: "center",
    paddingVertical: 8,
  },
  winnerPresenterImage: {
    width: 170,
    height: 96,
  },
  winnerCard: {
    width: "100%",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceSoft,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  winnerAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 8,
  },
  winnerFlag: {
    width: 30,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: theme.white,
  },
  winnerName: {
    color: theme.black,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  winnerPts: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  winnerBackButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primary,
  },
  winnerBackButtonText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
  },
});