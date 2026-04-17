import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Animated,
    View,
    Image,
    StyleSheet,
    TextInput,
    Dimensions,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import theme from "../../styles/theme";
import { loadQuiz } from "../../services/quizService"; // 🔹 you’ll need to create this
import LoadingScreen from "../LoadingScreen";
import log from "../../utils/logService";
import { page, limit } from "../../utils/constanteService";
import LinearGradient from "react-native-linear-gradient";
import { useRoute, useNavigation } from "@react-navigation/native";
import debounce from "lodash/debounce";
import { translate } from '../../services/translateService';
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemeStackParamList } from "../../navigation/types";

const { width, height } = Dimensions.get("window");

interface Quiz {
    id: number;
    name: string;
    description: string;
}

type HomeScreenNavigationProp = NativeStackNavigationProp<ThemeStackParamList, "ThemeScreen">;

export default function QuizScreen() {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const route = useRoute<any>();
    const [search, setSearch] = useState("");
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(page);
    const [hasMore, setHasMore] = useState(true);
    const { themeId } = route.params;
    const scrollY = useRef(new Animated.Value(0)).current;

    const animatedTop = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [height * 0.18, 0],
        extrapolate: "clamp",
    });

    const fetchQuizzes = async (currentPage: number) => {
        try {

            setLoadingMore(true);

            const quiz = await loadQuiz(themeId, currentPage, limit, search);

            setQuizzes(prev => {
                const updated = currentPage === 1 ? quiz.data : [...prev, ...quiz.data];

                const more = updated.length < quiz.total;
                setHasMore(more);

                if (!more) setLoadingMore(false);

                return updated;
            });

        } catch (error) {
            log.error("Failed to load quizzes:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreQuizzes = () => {
        if (hasMore) {
            const nextPage = pageNumber + 1;
            setPageNumber(nextPage);
            fetchQuizzes(nextPage);
        }
    };

    const debouncedLoadMore = useCallback(
        debounce(() => {
            loadMoreQuizzes();
        }, 700),
        [loadMoreQuizzes]
    );

    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            if (query.length >= 3) {
                try {
                    setLoadingMore(true);
                    setPageNumber(1);
                    fetchQuizzes(1);
                } catch (error) {
                    log.error("Search failed:", error);
                }
            } else if (query.length === 0) {
                setPageNumber(1);
                fetchQuizzes(1);
            }
        }, 700),
        [themeId]
    );

    const handleSearchChange = (text: string) => {
        setSearch(text);
        debouncedSearch(text);
    };

    useEffect(() => {
        if (themeId) {
            setPageNumber(page);
            setHasMore(true);
            fetchQuizzes(1);
        }
    }, [themeId]);

    const filteredQuizzes = (quizzes || []).filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const renderQuizItem = ({ item }: any) => (
        <TouchableOpacity activeOpacity={0.8} style={styles.itemWrapper} onPress={() => navigation.navigate("PlayQuizScreen", { quizId: item.id })}>
            <LinearGradient
                colors={[theme.secondary, theme.secondary, theme.primary, theme.primary]}
                locations={[0, 0.6, 0.6, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.0 }}
                style={styles.item}
            >
                <View style={styles.itemContent}>
                    <View style={styles.textContainer}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.imageWrapper}>
                        <Image
                            source={require("../../assets/images/bg-quiz.png")}
                            style={styles.picture}
                        />
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View
                style={styles.butonBack}
            >
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <FontAwesomeFreeSolid name="arrow-left" size={28} color={theme.white} />
                </TouchableOpacity>
            </View>
            <View style={styles.topSection}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={translate('home.search')}
                        placeholderTextColor={theme.gray}
                        value={search}
                        onChangeText={handleSearchChange}
                    />
                </View>
            </View>

            <Animated.View
                style={[
                    styles.bottomSection,
                    { top: animatedTop }
                ]}
            >
                {filteredQuizzes.length === 0 ? (
                    <View style={{ alignItems: "center", marginTop: 20 }}>
                        <Text style={{ color: theme.placeholder }}>No quizzes found</Text>
                    </View>
                ) : (
                    <Animated.FlatList
                        keyExtractor={(item, index) =>
                            item.id ? String(item.id) : String(index)
                        }
                        bounces={false}
                        data={filteredQuizzes}
                        renderItem={renderQuizItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.contentContainerStyle}
                        onEndReached={debouncedLoadMore}
                        onEndReachedThreshold={0.4}
                        ListFooterComponent={
                            loadingMore ? (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.primary}
                                    style={{ marginVertical: 10 }}
                                />
                            ) : null
                        }
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={29}
                    />
                )}
            </Animated.View>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
        
    container: {
        flex: 1,
        backgroundColor: theme.primary,
    },
    butonBack: {
        height: 30,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        backgroundColor: theme.primary,
        zIndex: 10,
    },
    contentContainerStyle: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 15,
    },
    topSection: {
        marginTop: 10,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    bottomSection: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.white,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        overflow: "hidden",
        paddingTop: 0,
        zIndex: 2,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    searchContainer: {
        backgroundColor: theme.white,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    searchInput: {
        fontSize: theme.fontSizeMiddle,
        color: theme.black,
        width: width - 80,
    },
    itemWrapper: {
        width: width * 0.9,
        height: height * 0.12,
        borderRadius: 20,
        overflow: "hidden",
    },
    item: {
        flex: 1,
        paddingTop: 4
    },
    textContainer: {
        flexShrink: 2,
        paddingLeft: 5,
        flex: 1,
    },

    itemTitle: {
        fontSize: theme.fontSizeTitle,
        color: theme.white,
        fontWeight: "bold",
        marginTop: 6
    },

    itemDescription: {
        fontSize: theme.fontSizeText,
        color: theme.white,
        opacity: 0.8,
        marginTop: 2,
        width: "70%",
    },

    itemContent: {
        flexDirection: "row",
        width: '100%',
        height: '100%',
    },

    itemIcon: {
        marginLeft: "auto",
    },

    picture: {
        width: 100,
        height: 50,
        resizeMode: 'contain',
        marginRight: 20,
    },

    imageWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        flexDirection: 'row',
        flex: 0,
    },
});