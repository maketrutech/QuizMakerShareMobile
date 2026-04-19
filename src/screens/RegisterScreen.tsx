import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import AuthShell from "../components/AuthShell";
import { register } from "../services/authService";
import { isGoogleCancelled, signInWithGoogle } from "../services/googleAuthService";
import { translate } from "../services/translateService";
import theme from "../styles/theme";
import log from "../utils/logService";
import { getItem, saveItem } from "../utils/storageService";
import { emailRegex, passwordRegex, usernameRegex } from "../utils/validationRegex";

const t = (key: string, fallback: string) => {
  const value = translate(key);
  return value === key ? fallback : value;
};

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

    if (!username.trim()) {
      newErrors.username = translate("register.error.username_required");
      valid = false;
    } else if (!usernameRegex.test(username)) {
      newErrors.username = translate("register.error.username_invalid");
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = translate("register.error.email_required");
      valid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = translate("register.error.email_invalid");
      valid = false;
    }

    if (!password) {
      newErrors.password = translate("register.error.password_required");
      valid = false;
    } else if (!passwordRegex.test(password)) {
      newErrors.password = translate("register.error.password_invalid");
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await register({
        username,
        email,
        password,
        tokenPhone: pushToken,
      });

      navigation.navigate("Home");
    } catch (error: any) {
      log.error("Register error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);

    try {
      const data = await signInWithGoogle(pushToken);
      await saveItem("userData", data);
      log.info("Google register/login success:", data);
      navigation.navigate("MainApp");
    } catch (error: any) {
      if (isGoogleCancelled(error)) {
        log.info("Google sign-in cancelled by user");
        return;
      }

      const message = error?.response?.data?.error || error?.message || t("auth.google_error", "Unable to sign in with Google.");
      log.error("Google register error:", error.response?.data || error.message);
      Alert.alert(t("auth.google_title", "Google sign-in"), message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title={`${translate("register.title")} ✨`}
      subtitle={translate("register.subtitle")}
      badge={translate("register.badge")}
    >
      <Text style={styles.label}>{translate("register.username_placeholder")}</Text>
      <TextInput
        placeholder={translate("register.username_placeholder")}
        value={username}
        onChangeText={setUsername}
        placeholderTextColor={theme.textMuted}
        style={styles.input}
      />
      {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

      <Text style={styles.label}>{translate("register.email_placeholder")}</Text>
      <TextInput
        placeholder={translate("register.email_placeholder")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={theme.textMuted}
        style={styles.input}
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      <Text style={styles.label}>{translate("register.password_placeholder")}</Text>
      <TextInput
        placeholder={translate("register.password_placeholder")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={theme.textMuted}
        style={styles.input}
      />
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, (loading || googleLoading) && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading || googleLoading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? `${translate("register.creating")}...` : translate("register.signup_button")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
        onPress={handleGoogleRegister}
        disabled={loading || googleLoading}
      >
        <Text style={styles.googleButtonText}>
          {googleLoading ? `${translate("loading")}...` : `🌐 ${t("auth.google_button", "Continue with Google")}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.secondaryButtonText}>{translate("register.login_link")}</Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.black,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.black,
    fontSize: 14,
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: theme.secondary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  googleButton: {
    marginTop: 12,
    backgroundColor: theme.white,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: theme.white,
    fontWeight: "800",
    fontSize: 15,
  },
  googleButtonText: {
    color: theme.black,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: theme.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});

