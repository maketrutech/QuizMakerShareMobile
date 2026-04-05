import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import log from "../utils/logService"; 
import colors from "../styles/theme";

type GenericListProps<T> = {
  uri: string;                                // API endpoint
  path: string;                               // navigation path
  renderItemContent: (item: T) => React.ReactNode; // custom render
  horizontal?: boolean;                       // orientation (default = false)
};

export default function GenericList<T>({
  uri,
  path,
  renderItemContent,
  horizontal = false,
}: GenericListProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(uri);
        const json = await res.json();
        setData(json);
      } catch (err) {
        log.error("Failed to fetch list:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uri]);

  const handlePress = (item: T) => {
    navigation.navigate(path, { item });
  };

  const renderItem = ({ item }: { item: T }) => (
    <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.8}>
      {renderItemContent(item)}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(_, index) => index.toString()}
      renderItem={renderItem}
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 15, gap: 15 }}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
