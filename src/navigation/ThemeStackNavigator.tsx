import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ThemeScreen from "../screens/themeScreen/themeScreen";
import QuizScreen from "../screens/themeScreen/quizScreen";
import PlayQuizScreen from "../screens/sharedScreen/PlayQuizScreen";
import { ThemeStackParamList } from "./types";

const ThemeStack = createNativeStackNavigator<ThemeStackParamList>();

export default function ThemeStackNavigator() {
  return (
    <ThemeStack.Navigator>
      <ThemeStack.Screen 
        name="ThemeScreen" 
        component={ThemeScreen} 
        options={{ headerShown: false }}
      />
      <ThemeStack.Screen 
        name="QuizScreen" 
        component={QuizScreen} 
        options={{ headerShown: false }}
      />
      <ThemeStack.Screen 
        name="PlayQuizScreen" 
        component={PlayQuizScreen} 
        options={{ headerShown: false }}
      />
    </ThemeStack.Navigator>
  );
}
