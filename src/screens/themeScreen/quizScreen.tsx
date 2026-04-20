import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import debounce from "lodash/debounce";
import { translate, useTranslationVersion } from "../../services/translateService";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemeStackParamList } from "../../navigation/types";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";
import { loadQuiz } from "../../services/quizService";
import log from "../../utils/logService";
import { page, limit } from "../../utils/constanteService";
import GenericList from "../../components/GenericList";
import GlassHeader from "../../components/GlassHeader";

type Quiz = {
  id: number;
  name: string;
  description: string;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<ThemeStackParamList, "ThemeScreen">;

export default function QuizScreen() {
  const translationVersion = useTranslationVersion();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<any>();
  const [search, setSearch] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageNumber, setPageNumber] = useState(page);
  const [hasMore, setHasMore] = useState(true);
  const searchRef = useRef("");
  const { themeId } = route.params;

  const fetchQuizzes = useCallback(async (currentPage: number, searchValue: string = searchRef.current) => {
    try {
      setLoadingMore(true);

      const quiz = await loadQuiz(themeId, currentPage, limit, searchValue);

      setQuizzes((prev) => {
        const updated = currentPage === 1 ? quiz.data : [...prev, ...quiz.data];
        const more = updated.length < quiz.total;
        setHasMore(more);
        return updated;
      });
    } catch (error) {
      log.error("Failed to load quizzes:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [themeId]);

  useFocusEffect(
    useCallback(() => {
      if (!themeId) {
        return;
      }

      setPageNumber(page);
      setHasMore(true);
      fetchQuizzes(1, searchRef.current);
    }, [fetchQuizzes, themeId, translationVersion])
  );

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      const trimmed = query.trim();
      setPageNumber(1);
      setHasMore(true);
      fetchQuizzes(1, trimmed);
    }, 500),
    [fetchQuizzes]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = pageNumber + 1;
      setPageNumber(nextPage);
      fetchQuizzes(nextPage);
    }
  };

  const renderQuizCard = (item: Quiz) => (
    <LinearGradient
      colors={["#fff4fb", "#f2efff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, commonStyles.softCardShadow]}
    >
      <View style={styles.cardBody}>
        <View style={styles.textZone}>
          <Text style={styles.pill}>{translate("quizBrowse.quiz")}</Text>
          <Text style={styles.title}>{item.name}</Text>
          <Text numberOfLines={2} style={styles.description}>
            {item.description || translate("quizBrowse.default_description")}
          </Text>
        </View>

        <View style={styles.playBadge}>
          <Text style={styles.playBadgeText}>{translate("quizBrowse.play")}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <GlassHeader
          title={translate("quizBrowse.title")}
          subtitle={translate("quizBrowse.subtitle")}
          onBackPress={() => navigation.goBack()}
          searchValue={search}
          onChangeSearch={(text) => {
            setSearch(text);
            debouncedSearch(text);
          }}
          onSubmitSearch={() => fetchQuizzes(1, search)}
          placeholder={translate("home.search")}
        />
      </View>

      <View style={styles.listWrapper}>
        <GenericList
          data={quizzes}
          loading={loading}
          estimatedItemSize={118}
          keyExtractor={(item) => String(item.id)}
          renderItemContent={(item) => renderQuizCard(item)}
          onItemPress={(item) => navigation.navigate("PlayQuizScreen", { quizId: item.id })}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          emptyStateText={translate("quizBrowse.empty")}
          contentContainerStyle={styles.contentContainer}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.footerLoader} />
            ) : null
          }
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
  headerBackground: {
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
    marginVertical: 14,
  },
  card: {
    borderRadius: theme.radiusCard,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 14,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textZone: {
    flex: 1,
  },
  pill: {
    alignSelf: "flex-start",
    color: theme.secondary,
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 6,
  },
  title: {
    color: theme.black,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  description: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  playBadge: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playBadgeText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
  },
});