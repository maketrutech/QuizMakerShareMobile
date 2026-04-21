import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassHeader from "../../components/GlassHeader";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";
import { translate, useTranslationVersion, getCurrentLanguage } from "../../services/translateService";
import { getItem } from "../../utils/storageService";
import { loadThemes } from "../../services/themeService";
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
  submitMultiplayerAnswer,
} from "../../services/multiplayerService";

type ThemeItem = {
  id: number;
  name: string;
};

type StoredUserData = {
  token: string;
  user?: {
    id: number;
    username?: string;
  };
};

const EMPTY_PLAYER_SLOTS = Array.from({ length: 4 }, (_, index) => ({
  id: `empty-${index}`,
}));

export default function MultiplayerQuizScreen({ navigation }: any) {
  useTranslationVersion();
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<MultiplayerQuestion | null>(null);
  const [presenterState, setPresenterState] = useState<"idle" | "speaking">("idle");
  const [statusText, setStatusText] = useState("Choose a theme to start matchmaking.");
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentSocketId, setCurrentSocketId] = useState<string>("");
  const [submittingAnswerId, setSubmittingAnswerId] = useState<number | null>(null);
  const [presenterImageFailed, setPresenterImageFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [themeResponse, stored] = await Promise.all([
          loadThemes(1, 100, ""),
          getItem<StoredUserData>("userData"),
        ]);

        setThemes(themeResponse?.data || []);
        setSelectedThemeId(themeResponse?.data?.[0]?.id || null);
        setCurrentUserId(typeof stored?.user?.id === "number" ? stored.user.id : null);
      } catch (error) {
        Alert.alert(translate("common.error"), translate("themeBrowse.empty"));
      } finally {
        setThemesLoading(false);
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
    socket.removeAllListeners("multiplayer:error");

    socket.on("multiplayer:room_state", (payload: MultiplayerRoomState) => {
      setRoomState(payload);
      setPresenterState(payload.presenterState || "idle");
      setDeadlineAt(payload.answerDeadlineAt || null);

      if (payload.phase === "matchmaking") {
        const waitingCount = payload.waitingCount || 1;
        const requiredCount = payload.requiredCount || 2;
        setStatusText(`Waiting for players ${waitingCount}/${requiredCount}`);
      } else if (payload.phase === "question-open") {
        setStatusText("Buzz first to answer.");
      } else if (payload.phase === "buzz-locked") {
        setStatusText("One player is answering now.");
      } else if (payload.phase === "finished") {
        setStatusText("Match finished.");
      }
    });

    socket.on("multiplayer:match_found", () => {
      setStatusText("Match found. Starting round...");
      setJoining(false);
    });

    socket.on("question_open", (payload: { presenterState?: "idle" | "speaking"; question: MultiplayerQuestion; questionIndex: number; totalQuestions: number }) => {
      setPresenterState(payload.presenterState || "idle");
      setCurrentQuestion(payload.question);
      setDeadlineAt(null);
      setSubmittingAnswerId(null);
      setStatusText(`Question ${payload.questionIndex}/${payload.totalQuestions}`);
    });

    socket.on("locked", (payload: { lockedSocketId: string; answerDeadlineAt?: number; presenterState?: "idle" | "speaking" }) => {
      setPresenterState(payload.presenterState || "speaking");
      setDeadlineAt(payload.answerDeadlineAt || null);
      setRoomState((current) => current ? { ...current, lockedSocketId: payload.lockedSocketId } : current);

      if (payload.lockedSocketId === socket.id) {
        setStatusText("You buzzed first. Answer now.");
      } else {
        setStatusText("Another player buzzed first.");
      }
    });

    socket.on("buzzer_reset", () => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setSubmittingAnswerId(null);
      setRoomState((current) => current ? { ...current, lockedSocketId: null } : current);
      setStatusText("Buzzer reset. Buzz again.");
    });

    socket.on("answer_result", (payload: { userId?: number | null; result: string }) => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setSubmittingAnswerId(null);

      if (payload.result === "correct") {
        setStatusText(payload.userId === currentUserId ? "Correct answer!" : "A player answered correctly.");
      } else if (payload.result === "wrong" || payload.result === "timeout" || payload.result === "disconnect-timeout") {
        setStatusText(payload.userId === currentUserId ? "Penalty applied. Wait for the reset." : "Wrong answer. Buzzer reopening.");
      } else if (payload.result === "reveal") {
        setStatusText("No players left for this question. Revealing answer.");
      }
    });

    socket.on("score_updated", (payload: { players: MultiplayerRoomState["players"] }) => {
      setRoomState((current) => current ? { ...current, players: payload.players } : current);
    });

    socket.on("game_finished", () => {
      setPresenterState("idle");
      setDeadlineAt(null);
      setStatusText("Game finished. See final scores below.");
    });

    socket.on("multiplayer:error", (payload: { message?: string }) => {
      const message = payload?.message || "Unable to continue multiplayer match.";
      setJoining(false);
      setStatusText(message);
      Alert.alert(translate("common.error"), message);
    });
  };

  const startMatchmaking = async () => {
    if (!selectedThemeId || joining) {
      return;
    }

    const storedUserData = await getItem<StoredUserData>("userData");
    if (!storedUserData?.token) {
      Alert.alert(translate("common.error"), "You must be logged in to play multiplayer.");
      return;
    }

    try {
      setJoining(true);
      const selectedLanguage = await getCurrentLanguage();
      const socket = await connectMultiplayerSocket(storedUserData.token);
      setCurrentSocketId(socket.id || "");
      attachSocketListeners();
      joinMultiplayerMatchmaking({ themeId: selectedThemeId, language: selectedLanguage });
      setStatusText("Joining matchmaking...");
    } catch (error: any) {
      setJoining(false);
      Alert.alert(translate("common.error"), error?.message || "Unable to connect to multiplayer.");
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

  const displayedPlayers = useMemo(() => {
    const activePlayers = roomState?.players || [];
    return [...activePlayers, ...EMPTY_PLAYER_SLOTS].slice(0, 4);
  }, [roomState]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("home.multiplayer_title") === "home.multiplayer_title" ? "Multiplayer Quiz" : translate("home.multiplayer_title")}
          subtitle={statusText}
          onBackPress={handleBack}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.presenterWrap}>
          <Image
            source={{ uri: getPresenterImageUrl(presenterState) }}
            style={styles.presenterImage}
            resizeMode="contain"
            onError={() => setPresenterImageFailed(true)}
          />
          {presenterImageFailed ? <Text style={styles.presenterFallback}>Quiz Master</Text> : null}
          {currentQuestion ? <Text style={styles.questionText}>{currentQuestion.questionText}</Text> : null}
          {deadlineAt ? <Text style={styles.timerText}>{timeLeft}s</Text> : null}
        </View>

        <View style={[styles.playersCard, commonStyles.softCardShadow]}>
          <Text style={styles.sectionTitle}>Players</Text>
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
                            <Text style={styles.botBadgeText}>BOT</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.playerScore}>{player.score} pts</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyAvatar} />
                      <Text style={styles.emptyText}>Waiting...</Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {!roomState || roomState.phase === "matchmaking" ? (
          <View style={[styles.matchmakingCard, commonStyles.softCardShadow]}>
            <Text style={styles.sectionTitle}>Choose a theme</Text>
            {themesLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <View style={styles.themeChips}>
                {themes.map((item) => {
                  const isSelected = selectedThemeId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.themeChip, isSelected && styles.themeChipSelected]}
                      onPress={() => setSelectedThemeId(item.id)}
                    >
                      <Text style={[styles.themeChipText, isSelected && styles.themeChipTextSelected]}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, (!selectedThemeId || joining) && styles.buttonDisabled]}
              onPress={startMatchmaking}
              disabled={!selectedThemeId || joining}
            >
              {joining ? <ActivityIndicator color={theme.white} /> : <Text style={styles.primaryButtonText}>Start matchmaking</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.buzzButton, !canBuzz && styles.buttonDisabled]}
          onPress={() => buzzMultiplayer(roomState?.roomId)}
          disabled={!canBuzz}
        >
          <Text style={styles.buzzButtonText}>BUZZ</Text>
        </TouchableOpacity>

        {canAnswer && currentQuestion ? (
          <View style={[styles.answersCard, commonStyles.softCardShadow]}>
            <Text style={styles.sectionTitle}>Choose your answer</Text>
            <View style={styles.answersGrid}>
              {currentQuestion.answers.map((answer) => (
                <TouchableOpacity
                  key={answer.id}
                  style={[styles.answerButton, submittingAnswerId === answer.id && styles.answerButtonActive]}
                  disabled={submittingAnswerId !== null}
                  onPress={() => {
                    setSubmittingAnswerId(answer.id);
                    submitMultiplayerAnswer({ roomId: roomState?.roomId, questionId: currentQuestion.id, answerId: answer.id });
                  }}
                >
                  <Text style={styles.answerButtonText}>{answer.answerText}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
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
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 42,
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
    gap: 10,
  },
  answerButton: {
    borderRadius: 16,
    backgroundColor: theme.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
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