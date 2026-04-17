import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { ThemeStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { translate } from "../../services/translateService";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import debounce from "lodash/debounce";
import theme from "../../styles/theme";
import commonStyles from "../../styles/commonStyles";
import { loadThemes } from "../../services/themeService";
import log from "../../utils/logService";
import { limit as PAGE_SIZE, page as DEFAULT_PAGE } from "../../utils/constanteService";
import GenericList from "../../components/GenericList";
import GlassHeader from "../../components/GlassHeader";

type HomeScreenNavigationProp = NativeStackNavigationProp<ThemeStackParamList, "ThemeScreen">;

type ThemeItem = {
  id: number;
  name: string;
  description: string;
  icon: string;
};

export default function ThemeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [search, setSearch] = useState("");
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [hasMore, setHasMore] = useState(true);

  const fetchThemes = async (
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

      const response = await loadThemes(pageNumber, PAGE_SIZE, searchValue.trim());
      const fetchedThemes = response?.data ?? [];
      const totalPages = response?.totalPages ?? 1;

      setThemes((prev) => {
        if (reset) return fetchedThemes;

        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueNewThemes = fetchedThemes.filter((item: ThemeItem) => !existingIds.has(item.id));
        return [...prev, ...uniqueNewThemes];
      });

      setPage(pageNumber);
      setHasMore(pageNumber < totalPages);
    } catch (error) {
      log.error("Failed to load themes:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchThemes(DEFAULT_PAGE, "", true);
  }, []);

  const debouncedSearch = useCallback(
    debounce((text: string) => {
      const trimmedText = text.trim();

      if (trimmedText.length >= 3) {
        fetchThemes(DEFAULT_PAGE, trimmedText, true);
      } else if (trimmedText.length === 0) {
        fetchThemes(DEFAULT_PAGE, "", true);
      }
    }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearch = () => {
    fetchThemes(DEFAULT_PAGE, search, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchThemes(page + 1, search, false);
    }
  };

  const renderThemeCard = (item: ThemeItem) => (
    <LinearGradient
      colors={["#f8f3ff", "#eefbff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, commonStyles.softCardShadow]}
    >
      <View style={styles.cardContent}>
        <View style={styles.textBlock}>
          <Text style={styles.cardEyebrow}>{translate("themeBrowse.theme")}</Text>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text numberOfLines={2} style={styles.cardDescription}>
            {item.description || translate("themeBrowse.default_description")}
          </Text>
        </View>

        <View style={styles.iconShell}>
          <FontAwesomeFreeSolid name={(item.icon || "palette") as any} size={22} color={theme.primary} />
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroBackground}>
        <GlassHeader
          title={translate("themeBrowse.title")}
          subtitle={translate("themeBrowse.subtitle")}
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
          data={themes}
          loading={loading}
          estimatedItemSize={122}
          keyExtractor={(item) => item.id.toString()}
          renderItemContent={(item) => renderThemeCard(item)}
          onItemPress={(item) => navigation.navigate("QuizScreen", { themeId: item.id })}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          emptyStateText={translate("themeBrowse.empty")}
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
  heroBackground: {
    backgroundColor: theme.primary,
    paddingBottom: 18,
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
    borderRadius: theme.radiusCard,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  textBlock: {
    flex: 1,
  },
  cardEyebrow: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  cardTitle: {
    color: theme.black,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardDescription: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 8,
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(143,124,255,0.12)",
  },
});