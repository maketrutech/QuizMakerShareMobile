import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Dimensions, FlatList, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import theme from "../../styles/theme";
import { loadThemes } from "../../services/themeService";
import LoadingScreen from "../../../src/screens/LoadingScreen";
import log from "../../utils/logService";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { ThemeStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { translate } from '../../services/translateService';
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import debounce from "lodash/debounce";
import { limit as PAGE_SIZE, page as DEFAULT_PAGE } from "../../utils/constanteService";

const { width, height } = Dimensions.get("window");
type HomeScreenNavigationProp = NativeStackNavigationProp<ThemeStackParamList, "ThemeScreen">;

export default function ThemeScreen() {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [search, setSearch] = useState("");
    const [themes, setThemes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(DEFAULT_PAGE);
    const [hasMore, setHasMore] = useState(true);

    const fetchThemes = async (pageNumber: number = DEFAULT_PAGE, searchValue: string = "", reset: boolean = false) => {
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

                const existingIds = new Set(prev.map((item: any) => item.id));
                const uniqueNewThemes = fetchedThemes.filter((item: any) => !existingIds.has(item.id));
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

    const renderThemeItem = ({ item }: any) => (
        <TouchableOpacity activeOpacity={0.8} style={styles.itemWrapper}  onPress={() => navigation.navigate("QuizScreen", { themeId: item.id })}>
            <LinearGradient
                colors={[theme.primary, theme.primary, theme.secondary, theme.secondary]}
                locations={[0, 0.5, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.0 }}
                style={styles.item}
            >
                <View style={styles.itemContent}>
                    <View style={styles.textContainer}>
                        <Text style={styles.itemTitle}>#{item.name}</Text>
                        <Text style={styles.itemDescription}>{item.description}</Text>
                    </View>
                    <FontAwesomeFreeSolid name={item.icon} size={30} color={theme.white} style={styles.itemIcon} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    if (loading && themes.length === 0) {
        return <LoadingScreen />;
    }

    return (
        <View style={styles.container}>
            {/* Orange top */}
            <View style={styles.topSection}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={translate('home.search')}
                        placeholderTextColor={theme.gray}
                        value={search}
                        onChangeText={(text) => {
                            setSearch(text);
                            debouncedSearch(text);
                        }}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                        <FontAwesomeFreeSolid name="search" size={18} color={theme.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* White bottom with rounded corners */}
            <View style={styles.bottomSection}>
                {loading ? (
                    <LoadingScreen />
                ) : (
                    <FlatList
                        data={themes}
                        keyExtractor={(item: any) => item.id.toString()}
                        renderItem={renderThemeItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, gap: 15, flexGrow: themes.length === 0 ? 1 : 0 }}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 16 }} /> : null}
                        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No themes found.</Text> : null}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.primary,
    },
    topSection: {
        height: height * 0.25,
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    bottomSection: {
        flex: 1,
        backgroundColor: theme.white,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        overflow: "hidden",
        paddingTop: 5
    },
    searchContainer: {
        backgroundColor: theme.white,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        flexDirection: "row",
        alignItems: "center",
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.black,
    },
    searchButton: {
        backgroundColor: theme.primary,
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 10,
    },
    itemWrapper: {
        width: width - 40,
        height: height * 0.15,
        borderRadius: 20,
        overflow: "hidden",
    },
    item: {
        flex: 1,
        padding: 15
    },
    textContainer: {
        flexShrink: 2,
    },

    itemTitle: {
        fontSize: theme.fontSizeTitle,
        color: "#fff",
        fontWeight: "bold",
    },

    itemDescription: {
        fontSize: theme.fontSizeText,
        color: "#fff",
        opacity: 0.8,
        marginTop: 4,
        width: "70%",
    },

    itemContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    itemIcon: {
        marginLeft: "auto",
    },
    emptyText: {
        textAlign: "center",
        color: theme.gray,
        fontSize: 16,
        marginTop: 40,
    },
});