import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassHeader from "../../components/GlassHeader";
import useAppAlert from "../../components/useAppAlert";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";
import { translate, useTranslationVersion, getCurrentLanguage } from "../../services/translateService";
import { getItem } from "../../utils/storageService";
import { getCountryFlagSource } from "../../services/countryService";
import { getAvatarSource } from "../../utils/avatarOptions";
import {
  MultiplayerQuestion,
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

export default function MultiplayerQuizScreen({ navigation }: any) {
  useTranslationVersion();
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) => {
    let value = translate(key);
    if (value === key) {
      value = fallback;
    }

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
  const [presenterState, setPresenterState] = useState<"idle" | "speaking">("idle");
  const [statusText, setStatusText] = useState(tr("multiplayer.initial_prompt", "Tap start matchmaking."));
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentSocketId, setCurrentSocketId] = useState<string>("");
  const [submittingAnswerId, setSubmittingAnswerId] = useState<number | null>(null);
  const [presenterImageFailed, setPresenterImageFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showAppAlert, appAlertDialog } = useAppAlert(translate("common.ok") === "common.ok" ? "OK" : translate("common.ok"));

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
        setStatusText(tr("multiplayer.waiting_for_players", "Waiting for players {waiting}/{required}", {
          waiting: waitingCount,
          required: requiredCount,
        }));
      } else if (payload.phase === "theme-voting") {
        setStatusText(tr("multiplayer.players_found", "Players found. Vote for a theme."));
      } else if (payload.phase === "question-open") {
        setStatusText(tr("multiplayer.phase_question_open", "Buzz first to answer."));
      } else if (payload.phase === "buzz-locked") {
        setStatusText(tr("multiplayer.phase_buzz_locked", "One player is answering now."));
      } else if (payload.phase === "finished") {
        setStatusText(tr("multiplayer.phase_finished", "Match finished."));
      }
    });

    socket.on("multiplayer:match_found", () => {
      setStatusText(tr("multiplayer.match_found", "Match found. Vote for a theme to start."));
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
      setStatusText(tr("multiplayer.vote_theme_prompt", "Vote for one theme."));
    });

    socket.on("multiplayer:theme_selected", (payload: { themeName?: string }) => {
      setStatusText(tr("multiplayer.theme_selected", "Theme selected: {theme}. Starting game...", {
        theme: payload?.themeName || tr("multiplayer.theme_generic", "Theme"),
      }));
    });

    socket.on("question_open", (payload: { presenterState?: "idle" | "speaking"; question: MultiplayerQuestion; questionIndex: number; totalQuestions: number }) => {
      setPresenterState(payload.presenterState || "idle");
      setCurrentQuestion(payload.question);
      setDeadlineAt(null);
      setSubmittingAnswerId(null);
      setStatusText(tr("multiplayer.question_count", "Question {index}/{total}", {
        index: payload.questionIndex,
        total: payload.totalQuestions,
      }));
    });

    socket.on("locked", (payload: { lockedSocketId: string; answerDeadlineAt?: number; presenterState?: "idle" | "speaking" }) => {
      setPresenterState(payload.presenterState || "speaking");
      setDeadlineAt(payload.answerDeadlineAt || null);
      setRoomState((current) => current ? { ...current, lockedSocketId: payload.lockedSocketId } : current);

      if (payload.lockedSocketId === socket.id) {
        setStatusText(tr("multiplayer.you_buzzed_first", "You buzzed first. Answer now."));
      } else {
        setStatusText(tr("multiplayer.other_buzzed_first", "Another player buzzed first."));
      }
    });

    socket.on("buzzer_reset", () => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setSubmittingAnswerId(null);
      setRoomState((current) => current ? { ...current, lockedSocketId: null } : current);
      setStatusText(tr("multiplayer.buzzer_reset", "Buzzer reset. Buzz again."));
    });

    socket.on("answer_result", (payload: { userId?: number | null; result: string }) => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setSubmittingAnswerId(null);

      if (payload.result === "correct") {
        setStatusText(
          payload.userId === currentUserId
            ? tr("multiplayer.you_answered_correct", "Correct answer!")
            : tr("multiplayer.player_answered_correct", "A player answered correctly.")
        );
      } else if (payload.result === "wrong" || payload.result === "timeout" || payload.result === "disconnect-timeout") {
        setStatusText(
          payload.userId === currentUserId
            ? tr("multiplayer.you_answered_wrong", "Penalty applied. Wait for the reset.")
            : tr("multiplayer.player_answered_wrong", "Wrong answer. Buzzer reopening.")
        );
      } else if (payload.result === "reveal") {
        setStatusText(tr("multiplayer.no_players_left", "No players left for this question. Revealing answer."));
      }
    });

    socket.on("score_updated", (payload: { players: MultiplayerRoomState["players"] }) => {
      setRoomState((current) => current ? { ...current, players: payload.players } : current);
    });

    socket.on("game_finished", () => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setStatusText(tr("multiplayer.game_finished", "Game finished. See final scores below."));
    });

    socket.on("multiplayer:error", (payload: { message?: string }) => {
      const message = payload?.message || tr("multiplayer.error_continue", "Unable to continue multiplayer match.");
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
      showAppAlert(translate("common.error"), tr("multiplayer.error_not_logged_in", "You must be logged in to play multiplayer."));
      return;
    }

    try {
      setJoining(true);
      const selectedLanguage = await getCurrentLanguage();
      const socket = await connectMultiplayerSocket(storedUserData.token);
      setCurrentSocketId(socket.id || "");
      attachSocketListeners();
      joinMultiplayerMatchmaking({ language: selectedLanguage });
      setStatusText(tr("multiplayer.joining_matchmaking", "Joining matchmaking..."));
    } catch (error: any) {
      setJoining(false);
      showAppAlert(translate("common.error"), error?.message || tr("multiplayer.error_connection", "Unable to connect to multiplayer."));
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
    roomState.phase === "buzz-locked" &&
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("home.multiplayer_title") === "home.multiplayer_title" ? tr("multiplayer.screen_title", "Multiplayer Quiz") : translate("home.multiplayer_title")}
          subtitle={statusText}
          onBackPress={handleBack}
        />
      </View>

      {!isGameplay ? (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canVoteTheme ? (
          <View style={[styles.playersCard, commonStyles.softCardShadow]}>
            <Text style={styles.sectionTitle}>{tr("multiplayer.vote_theme_label", "Vote Theme")}</Text>
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
                {presenterImageFailed ? <Text style={styles.presenterFallback}>{tr("multiplayer.presenter_fallback", "Quiz Master")}</Text> : null}
                {currentQuestion ? <Text style={styles.questionText}>{currentQuestion.questionText}</Text> : null}
                {deadlineAt ? <Text style={styles.timerText}>{timeLeft}s</Text> : null}
              </View>
            ) : null}

            <View style={[styles.playersCard, commonStyles.softCardShadow]}>
              <Text style={styles.sectionTitle}>{tr("multiplayer.players_section", "Players")}</Text>
              <View style={styles.playersGrid}>
                {displayedPlayers.map((player: any) => {
                  const isRealPlayer = Boolean(player.userId);

                  return (
                    <View
                      key={String(player.userId || player.id)}
                      style={[styles.playerSlot, !isRealPlayer && styles.playerSlotEmpty]}
                    >
                      {isRealPlayer ? (
                        <>
                          <Image source={getAvatarSource(player.avatar, player.avatarUrl)} style={styles.playerAvatar} />
                          {player.country?.key ? (
                            <Image source={getCountryFlagSource(player.country.flagUrl, player.country.key)} style={styles.playerFlag} />
                          ) : null}
                          <View style={styles.playerIdentityRow}>
                            <Text style={styles.playerName} numberOfLines={1}>{player.username}</Text>
                            {player.isVirtual ? (
                              <View style={styles.botBadge}>
                                <Text style={styles.botBadgeText}>{tr("multiplayer.bot_badge", "BOT")}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.playerScore}>{player.score} pts</Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.emptyAvatar} />
                          <Text style={styles.emptyText}>{tr("multiplayer.waiting_status", "Waiting...")}</Text>
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
                    {joining ? <ActivityIndicator color={theme.white} /> : <Text style={styles.primaryButtonText}>{tr("multiplayer.start_button", "Start matchmaking")}</Text>}
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
                <Image source={getAvatarSource(player.avatar, player.avatarUrl)} style={styles.cornerAvatar} />
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
                  <Text style={styles.questionEyebrow}>{tr("multiplayer.live_question_label", "Live Question")}</Text>
                  <Text style={styles.centerGameQuestion}>{currentQuestion.questionText}</Text>
                </View>
                <View style={styles.answersGrid}>
                  {currentQuestion.answers.map((answer) => (
                    <TouchableOpacity
                      key={answer.id}
                      style={[styles.answerButton, submittingAnswerId === answer.id && styles.answerButtonActive]}
                      disabled={submittingAnswerId !== null || !canAnswer}
                      onPress={() => {
                        setSubmittingAnswerId(answer.id);
                        submitMultiplayerAnswer({ roomId: roomState?.roomId, questionId: currentQuestion.id, answerId: answer.id });
                      }}
                    >
                      <Text style={styles.answerButtonText}>{answer.answerText}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {!canAnswer ? (
                  <Text style={styles.readonlyHint}>
                    {tr("multiplayer.waiting_for_answer", "Waiting for {player} answer...", {
                      player: lockedPlayer?.username || tr("multiplayer.player_generic", "player"),
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
                {presenterImageFailed ? <Text style={styles.presenterFallback}>{tr("multiplayer.presenter_fallback", "Quiz Master")}</Text> : null}
                <View style={styles.questionHero}>
                  <Text style={styles.questionEyebrow}>{tr("multiplayer.round_question_label", "Round Question")}</Text>
                  {currentQuestion ? (
                    <Text style={styles.centerGameQuestion}>{currentQuestion.questionText}</Text>
                  ) : (
                    <Text style={styles.centerGameQuestion}>{tr("multiplayer.get_ready", "Get ready for next question...")}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.bigBuzzButton, !canBuzz && styles.buttonDisabled]}
                  onPress={() => buzzMultiplayer(roomState?.roomId)}
                  disabled={!canBuzz}
                >
                  <Text style={styles.bigBuzzButtonText}>{tr("multiplayer.buzz_button", "BUZZ")}</Text>
                </TouchableOpacity>
                {deadlineAt ? <Text style={styles.timerText}>{timeLeft}s</Text> : null}
              </View>
            )}
          </View>
        </View>
      )}

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
    width: 136,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    marginBottom: 5,
  },
  cornerName: {
    color: theme.black,
    fontSize: 12,
    fontWeight: "800",
  },
  cornerPts: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
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
  answerButtonText: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});