import React, { useEffect, useState } from "react";
import { View, StyleSheet, TextInput, Dimensions, FlatList, Text, TouchableOpacity } from "react-native";
import theme from "../../styles/theme";
import { loadThemes } from "../../services/themeService";
import LoadingScreen from "../../../src/screens/LoadingScreen";
import log from "../../utils/logService";
import LinearGradient from "react-native-linear-gradient";
import { Icon } from '@rneui/themed';
import { useNavigation } from "@react-navigation/native";
import { HomeStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { translate } from '../../services/translateService';

const { width, height } = Dimensions.get("window");
type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, "HomeConnectedMain">;

export default function HomeConnectedScreen() {
	 const navigation = useNavigation<HomeScreenNavigationProp>();
	const [search, setSearch] = useState("");
	const [themes, setThemes] = useState([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		const fetchThemes = async () => {
			try {
				const data = await loadThemes();
				setThemes(data);
			} catch (error) {
				log.error("Failed to load themes:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchThemes();
	}, []);

	const renderThemeItem = ({ item }: any) => (
		<TouchableOpacity activeOpacity={0.8} style={styles.itemWrapper}  onPress={() => navigation.navigate("HomeQuizScreen", { themeId: item.id })}>
			<LinearGradient
				colors={[theme.primary, theme.primary, theme.secondary, theme.secondary]}
				locations={[0, 0.5, 0.5, 1]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.0 }}
				style={styles.item}
			>
				<View style={styles.itemContent}>
					<View style={styles.textContainer}>
						<Text style={styles.itemTitle}>#{item.name}</Text>
						<Text style={styles.itemDescription}>{item.description}</Text>
					</View>
					<Icon name={item.icon} type="material" size={75} color={theme.white} style={styles.itemIcon} />
				</View>
			</LinearGradient>
		</TouchableOpacity>
	);

	if (loading) {
		return <LoadingScreen />;
	}

	return (
		<View style={styles.container}>
			{/* Orange top */}
			<View style={styles.topSection}>
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchInput}
						placeholder={translate('home.search')}
						placeholderTextColor={theme.gray}
						value={search}
						onChangeText={setSearch}
					/>
				</View>
			</View>

			{/* White bottom with rounded corners */}
			<View style={styles.bottomSection}>
				<FlatList
					data={themes}
					keyExtractor={(item: any) => item.id.toString()}
					renderItem={renderThemeItem}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ padding: 20, gap: 15 }}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.primary,
	},
	topSection: {
		height: height * 0.25,
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	bottomSection: {
		flex: 1,
		backgroundColor: theme.white,
		borderTopLeftRadius: 25,
		borderTopRightRadius: 25,
		overflow: "hidden",
		paddingTop: 5
	},
	searchContainer: {
		backgroundColor: theme.white,
		borderRadius: 12,
		paddingHorizontal: 15,
		paddingVertical: 8,
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
	},
	searchInput: {
		fontSize: 16,
		color: theme.black,
		width: width - 80,
	},
	itemWrapper: {
		width: width * 0.7,
		height: height * 0.2,
		borderRadius: 20,
		overflow: "hidden",
	},
	item: {
		flex: 1,
		padding: 15,
	},
	textContainer: {
		flexShrink: 2,
	},

	itemTitle: {
		fontSize: theme.fontSizeTitle,
		color: "#fff",
		fontWeight: "bold",
	},

	itemDescription: {
		fontSize: theme.fontSizeText,
		color: "#fff",
		opacity: 0.8,
		marginTop: 4,
		width: "70%",       // limits description to 50% of card width
	},

	itemContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	itemIcon: {
		marginLeft: "auto",
	},
});