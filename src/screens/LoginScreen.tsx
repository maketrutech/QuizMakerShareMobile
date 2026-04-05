import React, { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Input, Button, Text } from "@rneui/themed";
import theme from "../styles/theme";
import { emailRegex, usernameRegex, passwordRegex } from "../utils/validationRegex";
import { login } from "../services/authService";
import log from "../utils/logService";
import { translate } from '../services/translateService';
import { saveItem } from "../utils/storageService";

export default function LoginScreen({ navigation }: any) {
  const [identifier, setIdentifier] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;
    const newErrors = { identifier: "", password: "" };

    if (!identifier.trim()) {
      newErrors.identifier = translate('login.error.identifier_required');
      valid = false;
    } else if (!(emailRegex.test(identifier) || usernameRegex.test(identifier))) {
      newErrors.identifier = translate('login.error.identifier_invalid');
      valid = false;
    }

    if (!password) {
      newErrors.password = translate('login.error.password_required');
      valid = false;
    } else if (!passwordRegex.test(password)) {
      //newErrors.password = translate('login.error.password_invalid');
      //valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (validate()) {
        log.info(`register`);
        setLoading(true);
      try {
        const data = await login({
          login: identifier, // can be email OR username
          password,
        });

        saveItem("userData", data);
        
        log.info("✅ Connexion réussie:", data);
        navigation.navigate("MainApp");
      } catch (error: any) {
        log.error("❌ Erreur lors de la connexion:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.formSection}>
          <Text h3 style={styles.title}>
            {translate('login.title')} 👋
          </Text>

          <Input
            placeholder={translate('login.identifier_placeholder')}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            leftIcon={{ type: "ionicon", name: "person-outline", color: theme.white }}
            inputStyle={{ color: theme.white }}
            placeholderTextColor={theme.placeholder}
            errorMessage={errors.identifier}
          />

          <Input
            placeholder={translate('login.password_placeholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={{ type: "ionicon", name: "lock-closed-outline", color: theme.white }}
            inputStyle={{ color: theme.white }}
            placeholderTextColor={theme.placeholder}
            errorMessage={errors.password}
          />

          <Button
            title={translate('login.login_button')}
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />

          <Button
            title={translate('login.register_link')}
            type="clear"
            titleStyle={styles.linkButtonTitle}
            onPress={() => navigation.navigate("Register")}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.primary,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    color: theme.white,
    textAlign: "center",
    marginBottom: 20,
  },
  formSection: {
    marginTop: 100,
  },
  input: {
    color: theme.white,
  },
  button: {
    backgroundColor: theme.secondary,
    paddingVertical: 12,
    borderRadius: 30,
  },
  buttonContainer: {
    marginTop: 20,
  },
  linkButtonTitle: {
    color: theme.white,
  },
});
