import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassHeader from "../../components/GlassHeader";
import GenericList from "../../components/GenericList";
import { translate, useTranslationVersion } from "../../services/translateService";
import { loadQuizPlayersPage } from "../../services/quizService";
import { getAvatarSource } from "../../utils/avatarOptions";
import { getCountryFlagSource } from "../../services/countryService";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";

const PAGE_SIZE = 10;

type PlayerItem = {
  rank: number;
  userId: number;
  username: string;
  avatar?: string;
  avatarUrl?: string;
  country?: { key: string; name?: string; flagUrl?: string | null } | null;
  bestScore: number;
  playCount: number;
  bestTimeSeconds?: number | null;
};

export default function QuizPlayersLeaderboardScreen({ navigation, route }: any) {
  useTranslationVersion();
  const { quizId, quizName, questionCount } = route.params || {};
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPlayers = useCallback(async (pageNumber: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await loadQuizPlayersPage(Number(quizId), pageNumber, PAGE_SIZE);
      const incoming = res?.data || [];

      setPlayers((prev) => {
        if (reset) {
          return incoming;
        }

        const existing = new Set(prev.map((item) => item.rank));
        const unique = incoming.filter((item: PlayerItem) => !existing.has(item.rank));
        return [...prev, ...unique];
      });

      setPage(pageNumber);
      setHasMore(Boolean(res?.hasMoreBelow));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchPlayers(1, true);
  }, [fetchPlayers]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={quizName || translate("playQuiz.leaderboard")}
          subtitle={translate("myQuiz.players_subtitle") === "myQuiz.players_subtitle" ? translate("myQuiz.subtitle") : translate("myQuiz.players_subtitle")}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      <View style={styles.listWrapper}>
        <GenericList
          data={players}
          loading={loading}
          estimatedItemSize={96}
          keyExtractor={(item) => String(item.rank)}
          emptyStateText={translate("myQuiz.no_players") === "myQuiz.no_players" ? translate("myQuiz.empty") : translate("myQuiz.no_players")}
          contentContainerStyle={styles.contentContainer}
          onEndReached={() => {
            if (!loading && !loadingMore && hasMore) {
              fetchPlayers(page + 1, false);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.footerLoader} />
            ) : null
          }
          renderItemContent={(item) => (
            <View style={[styles.card, commonStyles.softCardShadow]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>

              <Image source={getAvatarSource(item.avatar, null)} style={styles.avatar} />

              {item.country?.key ? (
                <Image
                  source={getCountryFlagSource(null, item.country.key)}
                  style={styles.rowFlag}
                />
              ) : null}

              <View style={styles.textWrap}>
                <Text style={styles.name}>{item.username}</Text>
                <View style={styles.badgesRow}>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>
                      🎯 {item.bestScore}{questionCount ? `/${questionCount}` : ""}
                    </Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>⏱️ {item.bestTimeSeconds ?? 0}s</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
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
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 8,
  },
  rowFlag: {
    width: 24,
    height: 16,
    borderRadius: 3,
    marginRight: 10,
    backgroundColor: theme.white,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    color: theme.black,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scoreBadge: {
    backgroundColor: `${theme.success}16`,
    borderColor: `${theme.success}40`,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scoreBadgeText: {
    color: theme.success,
    fontSize: 12,
    fontWeight: "800",
  },
  timeBadge: {
    backgroundColor: `${theme.primary}12`,
    borderColor: `${theme.primary}40`,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeBadgeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "800",
  },
});