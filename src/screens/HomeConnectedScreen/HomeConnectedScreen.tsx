import React from "react";
import { View, StyleSheet } from "react-native";
import colors from "../../styles/theme";


export default function HomeConnectedScreen() {


  return (
    <View style={styles.container}>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  }
});
