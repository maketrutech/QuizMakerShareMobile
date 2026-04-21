import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import AppDialog from "./AppDialog";
import theme from "../styles/theme";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  onClose?: (() => void) | null;
};

export default function useAppAlert(okLabel = "OK") {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    onClose: null,
  });

  const showAppAlert = (title: string, message: string, onClose?: () => void) => {
    setState({
      visible: true,
      title,
      message,
      onClose: onClose || null,
    });
  };

  const closeAlert = () => {
    const nextAction = state.onClose;
    setState((prev) => ({ ...prev, visible: false, onClose: null }));
    if (nextAction) {
      nextAction();
    }
  };

  const appAlertDialog = (
    <AppDialog visible={state.visible} title={state.title} subtitle={state.message} onClose={closeAlert}>
      <TouchableOpacity style={styles.okButton} onPress={closeAlert}>
        <Text style={styles.okButtonText}>{okLabel}</Text>
      </TouchableOpacity>
    </AppDialog>
  );

  return { showAppAlert, appAlertDialog };
}

const styles = StyleSheet.create({
  okButton: {
    marginTop: 4,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primary,
  },
  okButtonText: {
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
