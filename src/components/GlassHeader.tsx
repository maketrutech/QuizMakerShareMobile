import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import theme from "../styles/theme";
import { translate } from "../services/translateService";

type GlassHeaderProps = {
  title: string;
  subtitle?: string;
  searchValue?: string;
  onChangeSearch?: (text: string) => void;
  onSubmitSearch?: () => void;
  placeholder?: string;
  onBackPress?: () => void;
};

export default function GlassHeader({
  title,
  subtitle,
  searchValue,
  onChangeSearch,
  onSubmitSearch,
  placeholder = translate("home.search"),
  onBackPress,
}: GlassHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.glassCard}>
        {Platform.OS === "ios" ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={18}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.96)"
          />
        ) : (
          <View style={styles.androidHeaderFill} />
        )}

        <View style={styles.content}>
          <View style={styles.topRow}>
            {onBackPress ? (
              <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
                <FontAwesomeFreeSolid name="arrow-left" size={16} color={theme.black} />
              </TouchableOpacity>
            ) : (
              <View style={styles.pillBadge}>
                <FontAwesomeFreeSolid name="star" size={12} color={theme.primary} />
                <Text style={styles.pillText}>{translate("common.pastel_ui")}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {typeof searchValue === "string" && onChangeSearch ? (
            <View style={styles.searchShell}>
              <FontAwesomeFreeSolid name="search" size={14} color={theme.textMuted} />
              <TextInput
                value={searchValue}
                onChangeText={onChangeSearch}
                onSubmitEditing={onSubmitSearch}
                placeholder={placeholder}
                placeholderTextColor={theme.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searchValue.trim().length > 0 ? (
                <TouchableOpacity onPress={() => onChangeSearch("")} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>×</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  glassCard: {
    borderRadius: theme.radiusCard,
    overflow: "hidden",
    backgroundColor: Platform.OS === "ios" ? theme.glass : "#f8f5ff",
    borderWidth: 1,
    borderColor: Platform.OS === "ios" ? theme.glassBorder : theme.border,
  },
  androidHeaderFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f8f5ff",
  },
  content: {
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.76)",
    gap: 6,
  },
  pillText: {
    color: theme.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.black,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.black,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  clearButtonText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "700",
    color: theme.textMuted,
  },
});