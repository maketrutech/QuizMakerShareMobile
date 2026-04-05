import React, { useState,  useEffect} from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Input, Button, Text, Icon } from "@rneui/themed";
import theme from "../styles/theme";
import { usernameRegex, emailRegex, passwordRegex } from "../utils/validationRegex";
import { register } from "../services/authService";
import { getItem } from "../utils/storageService";
import log from "../utils/logService";
import { translate } from '../services/translateService';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);  
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getItem<string>("pushToken");
      setPushToken(token);
    };
    fetchToken();
  }, []);

  const validate = () => {
    let valid = true;
    const newErrors = { username: "", email: "", password: "" };
    setLoading(true);

    if (!username.trim()) {
      newErrors.username = translate('register.error.username_required');
      valid = false;
    } else if (!usernameRegex.test(username)) {
      newErrors.username = translate('register.error.username_invalid');
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = translate('register.error.email_required');
      valid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = translate('register.error.email_invalid');
      valid = false;
    }

    if (!password) {
      newErrors.password = translate('register.error.password_required');
      valid = false;
    } else if (!passwordRegex.test(password)) {
      newErrors.password = translate('register.error.password_invalid');
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (validate()) {
      setLoading(true);
      try {
        
        const data = await register({
          username,
          email,
          password,
          tokenPhone: pushToken,
        });

        // Exemple : redirection après succès
        navigation.navigate("Home");

      } catch (error: any) {
        log.error("Erreur lors de l'inscription:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    } else {
        setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
       

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text h3 style={styles.title}>
            {translate('register.title')} ✨
          </Text>
          <Input
            placeholder={translate('register.username_placeholder')}
            value={username}
            onChangeText={setUsername}
            leftIcon={{ type: "ionicon", name: "person-outline", color: theme.white }}
            inputStyle={styles.input}
            placeholderTextColor={theme.placeholder}
            errorMessage={errors.username}
          />
          <Input
            placeholder={translate('register.email_placeholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={{ type: "ionicon", name: "mail-outline", color: theme.white }}
           inputStyle={styles.input}
            placeholderTextColor={theme.placeholder}
            errorMessage={errors.email}
          />
          <Input
            placeholder={translate('register.password_placeholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={{ type: "ionicon", name: "lock-closed-outline", color: theme.white }}
            inputStyle={styles.input}
            placeholderTextColor={theme.placeholder}
            errorMessage={errors.password}
          />

          <Button
            title={translate('register.signup_button')}
           buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
            onPress={handleRegister}
            loading={ loading } 
            disabled = { loading } 
          />

          <Button
            title={translate('register.login_link')}
            type="clear"
            titleStyle={styles.linkButtonTitle}
            onPress={() => navigation.navigate("Login")}
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

