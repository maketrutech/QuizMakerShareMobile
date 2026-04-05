import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeConnectedScreen from "../screens/HomeConnectedScreen/HomeConnectedScreen";
import HomeQuizScreen from "../screens/HomeConnectedScreen/HomeQuizScreen";
import { HomeStackParamList } from "./types";

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        name="HomeConnectedMain" 
        component={HomeConnectedScreen} 
        options={{ headerShown: false }}
      />
      <HomeStack.Screen 
        name="HomeQuizScreen" 
        component={HomeQuizScreen} 
        options={{ headerShown: false }}
      />
      {/* add more screens here if needed */}
    </HomeStack.Navigator>
  );
}
