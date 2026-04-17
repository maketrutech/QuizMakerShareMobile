import React, { useState, useRef, useEffect } from "react";
import {
    Animated,
    View,
    StyleSheet,
    TextInput,
    Dimensions,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert
} from "react-native";
import theme from "../../styles/theme";
import { saveQuiz } from "../../services/quizService";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import { SafeAreaView } from 'react-native-safe-area-context';
import { translate } from '../../services/translateService';
import { loadThemes } from "../../services/themeService";
import log from "../../utils/logService";
import { getItem } from "../../../src/utils/storageService";

const { width, height } = Dimensions.get("window");

export default function CreateQuizScreen({ navigation }: any) {
    // Quiz Metadata
    const [quizTitle, setQuizTitle] = useState("");
    
    // Current Question Form
    const [questionText, setQuestionText] = useState("");
    const [answers, setAnswers] = useState(["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState<number | null>(null);

    // Inside your CreateQuizScreen component
   const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
    const [themes, setThemes] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Array to store all completed questions
    const [allQuestions, setAllQuestions] = useState<any[]>([]);

    const scrollY = useRef(new Animated.Value(0)).current;

    const animatedTop = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [height * 0.20, 0], 
        extrapolate: "clamp",
    });

    const selectedThemeName = themes.find(t => t.id === selectedThemeId)?.name || "Select a Theme";

     const [deviceLanguage, setDeviceLanguage] = useState("fr");

    useEffect(() => {
        const initializeData = async () => {
            const getThemes = async () => {
                const data = await loadThemes(1, 100, "");
                setThemes(data?.data || []);
            };
            const deviceLanguage: any = await getItem("deviceLanguage");
            setDeviceLanguage(deviceLanguage);
            getThemes();
        };
        initializeData();
    }, []);

    const handleAnswerChange = (text: string, index: number) => {
        const newAnswers = [...answers];
        newAnswers[index] = text;
        setAnswers(newAnswers);
    };

    const handleAddNext = () => {
        if (!questionText || correctIndex === null || answers.some(a => !a)) {
            Alert.alert("Error", "Please fill the question, all 4 answers, and mark the correct one.");
            return;
        }

        const newQuestion = {
            question: questionText,
            options: answers,
            correctAnswer: answers[correctIndex],
            translations: [deviceLanguage]
        };

        setAllQuestions([...allQuestions, newQuestion]);
        
        // Reset form for next question
        setQuestionText("");
        setAnswers(["", "", "", ""]);
        setCorrectIndex(null);
        Alert.alert("Success", "Question added! Now create the next one.");
    };

    const handleFinalSave = async () => {

        if (!quizTitle) {
            Alert.alert("Error", "Please select a title for your quiz.");
            return;
        }
        
        if (!selectedThemeId) {
            Alert.alert("Error", "Please select a theme for your quiz.");
            return;
        }

        if (allQuestions.length === 0) {
            Alert.alert("Error", "Add at least one question before saving.");
            return;
        }
        
        try {
            const finalData = { 
                name: quizTitle, 
                fk_theme: selectedThemeId,
                questions: allQuestions ,
                translations: [deviceLanguage]
            };
            const res = await saveQuiz(finalData);
            if(res.message) {
               // navigation.goBack();
            } else {
                Alert.alert("Error", "There was an issue saving your quiz. Please try again.");
            }
            
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.butonBack}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <FontAwesomeFreeSolid name="arrow-left" size={28} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Quiz</Text>
            </View>

            {/* Top Section: Quiz Info */}
            <View style={styles.topSection}>
                <TextInput
                    style={styles.quizTitleInput}
                    placeholder="Quiz Title (e.g. Science 101)"
                    placeholderTextColor={theme.gray}
                    value={quizTitle}
                    onChangeText={setQuizTitle}
                />
                <Text style={styles.countText}>Questions added: {allQuestions.length}</Text>
            </View>

            {/* Bottom Section: Question Form */}
            <Animated.View style={[styles.bottomSection, { top: animatedTop }]}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                >

                    {/* Dropdown Button */}
    <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
    >
        <Text style={styles.dropdownButtonText}>{selectedThemeName}</Text>
        <FontAwesomeFreeSolid 
            name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
            size={14} 
            color={theme.primary} 
        />
    </TouchableOpacity>

    {/* Dropdown List (Absolute positioned so it floats over the content) */}
    {isDropdownOpen && (
        <View style={styles.dropdownList}>
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                {themes.map((t) => (
                    <TouchableOpacity 
                        key={t.id} 
                        style={styles.dropdownItem}
                        onPress={() => {
                            setSelectedThemeId(t.id);
                            setIsDropdownOpen(false);
                        }}
                    >
                        <Text style={styles.dropdownItemText}>{t.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    )}
                    <Text style={styles.label}>Question</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Type your question here..."
                        value={questionText}
                        onChangeText={setQuestionText}
                        multiline
                    />

                    <Text style={styles.label}>Answers (Check the correct one)</Text>
                    {answers.map((ans, idx) => (
                        <View key={idx} style={styles.answerRow}>
                            <TextInput
                                style={styles.answerInput}
                                placeholder={`Answer ${idx + 1}`}
                                value={ans}
                                onChangeText={(text) => handleAnswerChange(text, idx)}
                            />
                            <TouchableOpacity 
                                onPress={() => setCorrectIndex(idx)}
                                style={[styles.checkbox, correctIndex === idx && styles.checkboxActive]}
                            >
                                {correctIndex === idx && <FontAwesomeFreeSolid name="check" size={14} color={theme.white} />}
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.nextButton} onPress={handleAddNext}>
                            <Text style={styles.buttonText}>Next Question</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveButton} onPress={handleFinalSave}>
                            <Text style={styles.buttonText}>Finish & Save</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.primary },
    butonBack: { height: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
    headerTitle: { color: theme.white, fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
    topSection: { height: height * 0.09, paddingHorizontal: 20, justifyContent: 'center' },
    quizTitleInput: { backgroundColor: theme.white, borderRadius: 10, padding: 12, fontSize: 16 },
    countText: { color: theme.white, marginTop: 10, fontWeight: '600' },
    bottomSection: {
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: theme.white, borderTopLeftRadius: 25, borderTopRightRadius: 25,
        elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1, shadowRadius: 5,zIndex: 1,
    },
    scrollContainer: { padding: 25 },
    label: { fontWeight: 'bold', marginBottom: 8, color: theme.black, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, textAlignVertical: 'top' },
    answerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    answerInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 10 },
    checkbox: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: theme.primary },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
    nextButton: { backgroundColor: theme.secondary, padding: 15, borderRadius: 10, width: '48%', alignItems: 'center' },
    saveButton: { backgroundColor: theme.primary, padding: 15, borderRadius: 10, width: '48%', alignItems: 'center' },
    buttonText: { color: theme.white, fontWeight: 'bold' },
    dropdownButton: {
        backgroundColor: theme.white,
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownButtonText: {
        color: theme.black,
        fontSize: 14,
    },
    dropdownList: {
        position: 'absolute',
        top: height * 0.18, // Positions it right under the button
        left: 20,
        right: 20,
        backgroundColor: theme.white,
        borderRadius: 10,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 1000,
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dropdownItemText: {
        color: theme.black,
        fontSize: 14,
    },
});