import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import theme from "../styles/theme"; // your color file
import { translate } from '../services/translateService';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.secondary} />
      <Text style={styles.text}>{translate('loading')}...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.primary, // violet background
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: theme.white, // white text
  },
});
