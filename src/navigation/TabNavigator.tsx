import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import theme from "../styles/theme";
import HomeStackNavigator from "./HomeStackNavigator";
import ProfilStackNavigator from "./ProfilStackNavigator";
import ThemeStackNavigator from "./ThemeStackNavigator";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
	return (
		<Tab.Navigator
			initialRouteName="HomeConnected"
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName = "home";

					if (route.name === "HomeConnected") {
						iconName = focused ? "home" : "home";
					} else if (route.name === "Profil") {
						iconName = focused ? "person" : "circle-user";
					} else if (route.name === "ThemeScreen") {
						iconName = focused ? "palette" : "palette";
					}

					return (
						<FontAwesomeFreeSolid 
							name={iconName as any}
							size={size} 
							color={color} 
						/>
					);
				},
				tabBarActiveTintColor: theme.primary,
				tabBarInactiveTintColor: theme.textMuted,
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: "700",
				},
				tabBarStyle: {
					position: "absolute",
					left: 16,
					right: 16,
					bottom: 16,
					height: 66,
					borderTopWidth: 0,
					borderRadius: 20,
					paddingTop: 8,
					paddingBottom: 8,
					backgroundColor: "rgba(255,255,255,0.92)",
					elevation: 8,
					shadowColor: theme.primary,
					shadowOffset: { width: 0, height: 8 },
					shadowOpacity: 0.12,
					shadowRadius: 16,
				},
				headerStyle: { backgroundColor: theme.primary },
				headerTintColor: theme.secondary,
			})}
		>
			<Tab.Screen 
				name="HomeConnected" 
				component={HomeStackNavigator} 
				options={{ headerShown: false }} 
			/>
			<Tab.Screen 
				name="ThemeScreen" 
				component={ThemeStackNavigator} 
				options={{ headerShown: false }} 
			/>
			<Tab.Screen 
				name="Profil" 
				component={ProfilStackNavigator} 
				options={{ headerShown: false }} 
			/>
		</Tab.Navigator>
	);
}
