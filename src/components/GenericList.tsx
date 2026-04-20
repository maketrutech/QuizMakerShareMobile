import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeInDown } from "react-native-reanimated";
import colors from "../styles/theme";
import { translate, useTranslationVersion } from "../services/translateService";

type GenericListProps<T> = {
  data: T[];
  renderItemContent: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onItemPress?: (item: T, index: number) => void;
  horizontal?: boolean;
  loading?: boolean;
  estimatedItemSize?: number;
  emptyStateText?: string;
  contentContainerStyle?: ViewStyle;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListFooterComponent?: React.ReactElement | null;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;
};

export default function GenericList<T>({
  data,
  renderItemContent,
  keyExtractor,
  onItemPress,
  horizontal = false,
  loading = false,
  estimatedItemSize = 120,
  emptyStateText = translate("common.nothing_to_display_yet"),
  contentContainerStyle,
  onEndReached,
  onEndReachedThreshold = 0.3,
  ListFooterComponent = null,
  showsHorizontalScrollIndicator = false,
  showsVerticalScrollIndicator = false,
}: GenericListProps<T>) {
  useTranslationVersion();

  if (loading && data.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{translate("common.no_results")}</Text>
        <Text style={styles.emptyText}>{emptyStateText}</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      horizontal={horizontal}
      estimatedItemSize={estimatedItemSize}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={contentContainerStyle}
      renderItem={({ item, index }: { item: T; index: number }) => {
        const content = renderItemContent(item, index);

        return (
          <Animated.View
            entering={FadeInDown.delay(index * 45).duration(400).springify().damping(14)}
          >
            {onItemPress ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => onItemPress(item, index)}
              >
                {content}
              </TouchableOpacity>
            ) : (
              content
            )}
          </Animated.View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
