import { StyleSheet } from "react-native";
import theme from "./theme";

export default StyleSheet.create({
  topRightButton: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  pagePadding: {
    paddingHorizontal: 20,
  },
  softCardShadow: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  glassSurface: {
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    borderRadius: theme.radiusCard,
    overflow: "hidden",
  },
});