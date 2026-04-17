import React, { useEffect, useState, useRef } from "react";

const DEFAULT_QUIZ_TIMER = 60;
const BONUS_TIME = 5;
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Animated,
} from "react-native";
import theme from "../../styles/theme";
import { useRoute, useNavigation } from "@react-navigation/native";
import { loadQuizById } from "../../services/quizService";
import { playSoundEffect, preloadSoundEffects, releaseSoundEffects } from "../../services/soundService";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import { SafeAreaView } from 'react-native-safe-area-context';

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
    questions: Question[];
}

export default function PlayQuizScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { quizId } = route.params;
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(DEFAULT_QUIZ_TIMER);
    const [initialTimer, setInitialTimer] = useState(DEFAULT_QUIZ_TIMER);
    const [selectedCorrect, setSelectedCorrect] = useState<boolean | null>(null);
    const timerRef = useRef<number | null>(null);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchQuiz = async () => {
            setLoading(true);
            preloadSoundEffects();
            const data = await loadQuizById(quizId);
            const totalTimer = data?.timerSeconds || (data?.questions?.length ? data.questions.length * 15 : DEFAULT_QUIZ_TIMER);
            setQuiz(data);
            setInitialTimer(totalTimer);
            setTimer(totalTimer);
            setLoading(false);
        };
        fetchQuiz();
    }, [quizId]);

    // Quiz timer effect
    useEffect(() => {
        if (showResult || loading || !quiz) return;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimer(prev => {
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

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            releaseSoundEffects();
        };
    }, []);

    useEffect(() => {
        if (showResult) {
            //playSoundEffect("finish");
        }
    }, [showResult]);


    if (loading || !quiz) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />;
    }

    // Only get question if not showing result
    const question = !showResult ? quiz.questions[current] : null;

    const handleAnswer = (answerId: number) => {
        if (selected !== null) return;

        setSelected(answerId);
        const currentQuestion = quiz?.questions[current];
        const answer = currentQuestion?.answers.find(a => a.id === answerId);
        const isCorrect = !!answer?.is_correct;

        setSelectedCorrect(isCorrect);

        if (isCorrect) {
            //playSoundEffect("correct");
            setScore(prev => prev + 1);
            setTimer(prev => prev + BONUS_TIME);
        } else {
            //playSoundEffect("wrong");
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
                setCurrent(prev => prev + 1);
                setSelected(null);
                setSelectedCorrect(null);
            } else {
                setShowResult(true);
            }
        }, 700);
    };

    const getQuestionFontSize = (text: string) => {
        const length = text?.length ?? 0;

        if (length > 220) return 15;
        if (length > 160) return 16;
        if (length > 110) return 18;
        if (length > 70) return 19;
        return 20;
    };

    const handleReplayQuiz = () => {
        setCurrent(0);
        setSelected(null);
        setSelectedCorrect(null);
        setScore(0);
        setTimer(initialTimer);
        setShowResult(false);
    };

    return (
        <SafeAreaView style={[styles.container, { flex: 1 }]}> 
            <View style={styles.butonBack}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <FontAwesomeFreeSolid name="arrow-left" size={28} color={theme.white} />
                </TouchableOpacity>
            </View>
            <View style={styles.quizHeader}>
                <Text style={styles.quizCounter}>
                    Question {current + 1}/{quiz.questions.length}
                </Text>
            </View>

            {!showResult && (
                <View style={styles.timerBarContainer}>
                    <View
                        style={[
                            styles.timerBar,
                            { width: `${Math.min((Math.max(timer, 0) / Math.max(initialTimer, 1)) * 100, 100)}%` },
                        ]}
                    />
                    <Text style={styles.timerText}>{Math.max(timer, 0)}s</Text>
                </View>
            )}

            {showResult ? (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>Quiz Finished!</Text>
                    <Text style={styles.resultText}>Your score: {score}</Text>

                    <TouchableOpacity style={styles.resultButton} onPress={handleReplayQuiz}>
                        <Text style={styles.resultButtonText}>Replay Quiz</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.resultButton, styles.backResultButton]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.resultButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : question ? (
                <View style={styles.quizContent}>
                    <View style={styles.scoreBadge}>
                        <Text style={styles.scoreLabel}>Correct answers</Text>
                        <Text style={styles.scoreValue}>{score}/{quiz.questions.length}</Text>
                    </View>

                    <ScrollView
                        style={styles.questionScroll}
                        contentContainerStyle={styles.questionContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text
                            style={[
                                styles.questionText,
                                {
                                    fontSize: getQuestionFontSize(question.questionText),
                                    lineHeight: getQuestionFontSize(question.questionText) * 1.4,
                                },
                            ]}
                        >
                            {question.questionText}
                        </Text>
                        {question.answers.map((ans) => {
                            const isSelected = selected === ans.id;
                            const isCorrectAnswer = isSelected && selectedCorrect === true;
                            const isWrongAnswer = isSelected && selectedCorrect === false;

                            return (
                                <Animated.View
                                    key={ans.id}
                                    style={[
                                        styles.answerWrapper,
                                        isWrongAnswer && { transform: [{ translateX: shakeAnim }] },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.answerButton,
                                            isCorrectAnswer && styles.correctAnswer,
                                            isWrongAnswer && styles.wrongAnswer,
                                            isSelected && !isCorrectAnswer && !isWrongAnswer && styles.selectedAnswer,
                                        ]}
                                        disabled={selected !== null}
                                        onPress={() => handleAnswer(ans.id)}
                                    >
                                        <Text style={styles.answerText}>{ans.answerText}</Text>
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
    quizHeader: {
        padding: 20,
        backgroundColor: theme.white,
        marginBottom: 10,
        marginTop: 20
    },
    quizCounter: {
        fontSize: 22,
        fontWeight: "bold",
        color: theme.primary,
        textAlign: "center",
    },
    quizContent: {
        flex: 1,
        margin: 20,
        marginTop: 10,
    },
    scoreBadge: {
        alignSelf: "center",
        backgroundColor: theme.white,
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginBottom: 12,
        alignItems: "center",
        borderWidth: 2,
        borderColor: theme.success,
        shadowColor: theme.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    scoreLabel: {
        fontSize: 12,
        color: theme.gray,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    scoreValue: {
        fontSize: 24,
        color: theme.success,
        fontWeight: "bold",
        marginTop: 2,
    },
    questionScroll: {
        flex: 1,
        backgroundColor: theme.white,
        borderRadius: 20,
    },
    questionContainer: {
        padding: 16,
        paddingBottom: 20,
        alignItems: "center",
    },
    questionText: {
        fontSize: 20,
        fontWeight: "bold",
        color: theme.primary,
        marginBottom: 14,
        textAlign: "center",
        width: "100%",
    },
    answerWrapper: {
        width: "100%",
    },
    answerButton: {
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: theme.secondary,
        borderRadius: 12,
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
    },
    nextButton: {
        marginTop: 12,
        marginBottom: 8,
        backgroundColor: theme.secondary,
        paddingVertical: 14,
        borderRadius: 12,
        borderColor: theme.secondary,
        borderWidth: 2,
        alignItems: "center",
        width: "100%",
    },
    nextButtonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: "bold",
    },
    resultContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.white,
        borderRadius: 20,
        marginHorizontal: 24,
        marginVertical: 20,
        padding: 20,
        width: 'auto',
        maxWidth: width,
    },
    resultText: {
        fontSize: 22,
        color: theme.primary,
        marginBottom: 10,
    },
    resultButton: {
        marginTop: 14,
        backgroundColor: theme.secondary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        width: "100%",
    },
    backResultButton: {
        backgroundColor: theme.primary,
    },
    resultButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: "bold",
    },
    timerBarContainer: {
        height: 36,
        marginHorizontal: 24,
        marginBottom: 16,
        marginTop: 0,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        position: 'relative',
        width: width - 48,
        backgroundColor: theme.gray,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.primary,
        overflow: 'hidden',
    },
    timerBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: 36,
        backgroundColor: theme.secondary,
        zIndex: 1,
    },
    timerText: {
        zIndex: 2,
        color: theme.white,
        fontWeight: 'bold',
        fontSize: 18,
        marginLeft: 12,
        textShadowColor: theme.white,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});
