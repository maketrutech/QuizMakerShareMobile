import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import debounce from "lodash/debounce";
import GlassHeader from "../../components/GlassHeader";
import GenericList from "../../components/GenericList";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";
import { translate } from "../../services/translateService";
import { loadMyQuizzes } from "../../services/quizService";

type MyQuizItem = {
  id: number;
  name: string;
  description?: string;
  totalPlayers: number;
  totalPlays: number;
  bestScore: number;
  questionCount: number;
  likeCount: number;
  likeRate: number;
};

const DEFAULT_PAGE = 1;
const PAGE_SIZE = 10;

const getAccentColor = (item: MyQuizItem) => {
  if (item.likeRate >= 50) {
    return theme.danger;
  }

  if (item.likeRate >= 25) {
    return theme.secondary;
  }

  return theme.primary;
};

const getStatusKey = (item: MyQuizItem) => {
  if (item.likeRate >= 50) {
    return "myQuiz.status_hot";
  }

  if (item.likeRate >= 25) {
    return "myQuiz.status_growing";
  }

  return "myQuiz.status_new";
};

export default function MyQuizScreen({ navigation }: any) {
  const [quizzes, setQuizzes] = useState<MyQuizItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [hasMore, setHasMore] = useState(true);

  const fetchMyQuizzes = useCallback(async (
    pageNumber: number = DEFAULT_PAGE,
    searchValue: string = "",
    reset: boolean = false
  ) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await loadMyQuizzes(pageNumber, PAGE_SIZE, searchValue.trim());
      const incoming = res?.data || [];
      const totalPages = res?.totalPages || 1;

      setQuizzes((prev) => {
        if (reset) {
          return incoming;
        }

        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueItems = incoming.filter((item: MyQuizItem) => !existingIds.has(item.id));
        return [...prev, ...uniqueItems];
      });

      setPage(pageNumber);
      setHasMore(pageNumber < totalPages);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchMyQuizzes(DEFAULT_PAGE, "", true);
  }, [fetchMyQuizzes]);

  const debouncedSearch = useCallback(
    debounce((text: string) => {
      const trimmed = text.trim();

      if (trimmed.length >= 3) {
        fetchMyQuizzes(DEFAULT_PAGE, trimmed, true);
      } else if (trimmed.length === 0) {
        fetchMyQuizzes(DEFAULT_PAGE, "", true);
      }
    }, 500),
    [fetchMyQuizzes]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearch = () => {
    fetchMyQuizzes(DEFAULT_PAGE, search, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchMyQuizzes(page + 1, search, false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("myQuiz.title")}
          subtitle={translate("myQuiz.subtitle")}
          onBackPress={() => navigation.goBack()}
          searchValue={search}
          onChangeSearch={(text) => {
            setSearch(text);
            debouncedSearch(text);
          }}
          onSubmitSearch={handleSearch}
          placeholder={translate("home.search")}
        />
      </View>

      <View style={styles.listWrapper}>
        <GenericList
          data={quizzes}
          loading={loading}
          estimatedItemSize={170}
          keyExtractor={(item) => String(item.id)}
          emptyStateText={translate("myQuiz.empty")}
          contentContainerStyle={styles.contentContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.footerLoader} />
            ) : null
          }
          renderItemContent={(item) => {
            const accentColor = getAccentColor(item);
            const statusKey = getStatusKey(item);

            return (
              <LinearGradient
                colors={[theme.surface, "#fff8fc"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, commonStyles.softCardShadow]}
              >
                <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

                <View style={styles.cardContent}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate("EditQuizScreen", { quizId: item.id })}
                  >
                    <View style={[styles.statusBadge, { backgroundColor: `${accentColor}22` }]}>
                      <Text style={[styles.statusText, { color: accentColor }]}>
                        {translate(statusKey)}
                      </Text>
                    </View>

                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardDescription}>
                      {item.description || translate("myQuiz.no_description")}
                    </Text>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricChip}>
                        <Text style={styles.metricLabel}>{translate("myQuiz.players")}</Text>
                        <Text style={styles.metricValue}>{item.totalPlayers}</Text>
                      </View>

                      <View style={styles.metricChip}>
                        <Text style={styles.metricLabel}>{translate("myQuiz.plays")}</Text>
                        <Text style={styles.metricValue}>{item.totalPlays}</Text>
                      </View>
                    </View>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricChip}>
                        <Text style={styles.metricLabel}>{translate("myQuiz.best_score")}</Text>
                        <Text style={styles.metricValue}>{item.bestScore}{item.questionCount ? `/${item.questionCount}` : ""}</Text>
                      </View>

                      <View style={styles.metricChip}>
                        <Text style={styles.metricLabel}>{translate("myQuiz.likes")}</Text>
                        <Text style={styles.metricValue}>{item.likeRate}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.playersButton}
                    onPress={() => navigation.navigate("QuizPlayersLeaderboardScreen", {
                      quizId: item.id,
                      quizName: item.name,
                      questionCount: item.questionCount,
                    })}
                  >
                    <Text style={styles.playersButtonText}>
                      {translate("myQuiz.view_players") === "myQuiz.view_players"
                        ? translate("myQuiz.players")
                        : translate("myQuiz.view_players")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            );
          }}
        />
      </View>
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
    paddingBottom: 16,
  },
  listWrapper: {
    flex: 1,
    marginTop: -8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  footerLoader: {
    marginVertical: 16,
  },
  card: {
    flexDirection: "row",
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    marginBottom: 14,
  },
  accentBar: {
    width: 10,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: theme.black,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardDescription: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricChip: {
    flex: 1,
    backgroundColor: theme.surfaceSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metricLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metricValue: {
    color: theme.black,
    fontSize: 18,
    fontWeight: "800",
  },
  playersButton: {
    marginTop: 4,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  playersButtonText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
