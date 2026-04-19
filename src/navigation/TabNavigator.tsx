import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "../styles/theme";
import HomeStackNavigator from "./HomeStackNavigator";
import ProfilStackNavigator from "./ProfilStackNavigator";
import ThemeStackNavigator from "./ThemeStackNavigator";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
	const insets = useSafeAreaInsets();
	const bottomInset = Math.max(insets.bottom, 4);

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
					fontSize: 10,
					fontWeight: "700",
					marginBottom: 2,
				},
				tabBarItemStyle: {
					paddingVertical: 1,
				},
				tabBarStyle: {
					position: "absolute",
					left: 16,
					right: 16,
					bottom: bottomInset,
					height: 60,
					borderTopWidth: 0,
					borderWidth: 0,
					paddingTop: 2,
					paddingBottom: 0,
					backgroundColor: "rgba(255,255,255,0.96)",
					elevation: 3,
					shadowColor: "#000000",
					shadowOffset: { width: 0, height: 3 },
					shadowOpacity: 0.08,
					shadowRadius: 8,
				},
				tabBarBackground: () => null,
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
