import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import { Button, Text } from "@rneui/themed";
import theme from "../styles/theme";
import { translate } from '../services/translateService';

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require("../assets/images/quiz-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Title */}
      <Text h3 style={styles.title}>
        {translate('home.title')} 🎮
      </Text>

      {/* Login Button */}
      <Button
        title={translate('home.login_button')}
        buttonStyle={styles.loginButton}
        containerStyle={styles.loginButtonContainer}
        titleStyle={styles.loginButtonTitle}
        onPress={() => navigation.navigate("Login")}
      />

      {/* Register Button */}
      <Button
        title={translate('home.register_button')}
        type="outline"
        buttonStyle={styles.registerButton}
        titleStyle={styles.registerButtonTitle}
        containerStyle={styles.registerButtonContainer}
        onPress={() => navigation.navigate("Register")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: width * 1.1, 
    height: width * 1.1,
    marginBottom: 20,
  },
  title: {
    color: theme.white,
    marginBottom: 40,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: theme.secondary,
    paddingVertical: 12,
    borderRadius: 30,
  },
  loginButtonContainer: {
    width: "80%",
    marginBottom: 15,
  },
  loginButtonTitle: {
    fontSize: theme.fontSizeButton,
  },
  registerButton: {
    borderColor: theme.secondary,
    borderWidth: 2,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: "white",
  },
  registerButtonTitle: {
    color: theme.primary,
    fontSize: theme.fontSizeButton,
  },
  registerButtonContainer: {
    width: "80%",
  },
});
