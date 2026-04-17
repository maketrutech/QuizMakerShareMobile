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
							name={iconName}
							size={size} 
							color={color} 
						/>
					);
				},
				tabBarActiveTintColor: theme.primary,
				tabBarInactiveTintColor: theme.gray,
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
