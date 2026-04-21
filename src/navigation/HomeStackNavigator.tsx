import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeConnectedScreen from "../screens/HomeConnectedScreen/HomeConnectedScreen";
import CreateQuizScreen from "../screens/CreateQuizScreen/CreateQuizScreen";
import MultiplayerQuizScreen from "../screens/sharedScreen/MultiplayerQuizScreen";
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
        name="CreateQuizScreen" 
        component={CreateQuizScreen} 
        options={{ headerShown: false }}
      />
      <HomeStack.Screen 
        name="MultiplayerQuizScreen" 
        component={MultiplayerQuizScreen} 
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}
