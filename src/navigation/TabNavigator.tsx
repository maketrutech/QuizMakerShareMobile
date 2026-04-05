import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Icon } from '@rneui/themed';
import theme from "../styles/theme";
import HomeStackNavigator from "./HomeStackNavigator";
import ProfileScreen from "../screens/HomeConnectedScreen/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
	return (
		<Tab.Navigator
			initialRouteName="HomeConnected"
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName = "home";

					if (route.name === "HomeConnected") {
						iconName = focused ? "home" : "home-outline";
					} else if (route.name === "Profil") {
						iconName = focused ? "person" : "person-outline";
					} else if (route.name === "Settings") {
						iconName = focused ? "settings" : "settings-outline";
					}

					return (
						<Icon 
							name={iconName}
							type="ionicon" 
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
				name="Profil" 
				component={ProfileScreen} 
				options={{ headerShown: false }} 
			/>
		</Tab.Navigator>
	);
}
