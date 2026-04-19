import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreateQuizScreen from "../screens/CreateQuizScreen/CreateQuizScreen";
import AIQuizCreatorScreen from "../screens/CreateQuizScreen/AIQuizCreatorScreen";
import ProfileScreen from "../screens/ProfilScreen/ProfileScreen";
import MyQuizScreen from "../screens/ProfilScreen/MyQuizScreen";
import EditProfileScreen from "../screens/ProfilScreen/EditProfileScreen";
import QuizPlayersLeaderboardScreen from "../screens/ProfilScreen/QuizPlayersLeaderboardScreen";
import { ProfilStackParamList } from "./types";

const HomeStack = createNativeStackNavigator<ProfilStackParamList>();

export default function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        	name="ProfileScreenMain" 
        	component={ProfileScreen} 
        	options={{ headerShown: false }}
      />
      <HomeStack.Screen 
            name="MyQuizScreen" 
            component={MyQuizScreen} 
            options={{ headerShown: false }}
        />
      <HomeStack.Screen 
            name="CreateQuizScreen" 
            component={CreateQuizScreen} 
            options={{ headerShown: false }}
        />
      <HomeStack.Screen 
            name="AIQuizCreatorScreen" 
            component={AIQuizCreatorScreen} 
            options={{ headerShown: false }}
        />
      <HomeStack.Screen 
            name="EditQuizScreen" 
            component={CreateQuizScreen} 
            options={{ headerShown: false }}
        />
      <HomeStack.Screen 
            name="EditProfileScreen" 
            component={EditProfileScreen} 
            options={{ headerShown: false }}
        />
      <HomeStack.Screen 
            name="QuizPlayersLeaderboardScreen" 
            component={QuizPlayersLeaderboardScreen} 
            options={{ headerShown: false }}
        />
      {/* add more screens here if needed */}
    </HomeStack.Navigator>
  );
}
