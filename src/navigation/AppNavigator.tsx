import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import RegisterScreen from "../screens/RegisterScreen";
import LoginScreen from "../screens/LoginScreen";
import LoadingScreen from "../screens/LoadingScreen";
import TabNavigator from "./TabNavigator";
import theme from "../styles/theme";
import { getItem } from "../utils/storageService";
import { checkToken } from "../services/tokenServie";

const Stack = createNativeStackNavigator();

const authScreenOptions = {
  title: "",
  headerStyle: {
    backgroundColor: theme.background,
  },
  headerTintColor: theme.primary,
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const userData: any = await getItem("userData");
      if (userData?.token) {
        const validToken = await checkToken();
        validToken ? setIsLoggedIn(true) : setIsLoggedIn(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? "MainApp" : "Home"}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={authScreenOptions}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={authScreenOptions}
        />
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainApp"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
