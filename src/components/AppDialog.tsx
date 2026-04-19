import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import theme from "../styles/theme";

type AppDialogProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function AppDialog({ visible, title, subtitle, onClose, children }: AppDialogProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.dialogCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(31,23,51,0.12)",
    zIndex: 999,
    elevation: 20,
  },
  dialogCard: {
    maxHeight: "82%",
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: theme.black,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.border,
  },
  closeText: {
    color: theme.black,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 22,
  },
  body: {
    paddingBottom: 6,
  },
});
