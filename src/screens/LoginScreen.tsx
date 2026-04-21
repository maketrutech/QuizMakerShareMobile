import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import AuthShell from "../components/AuthShell";
import useAppAlert from "../components/useAppAlert";
import { login } from "../services/authService";
import { isGoogleCancelled, signInWithGoogle } from "../services/googleAuthService";
import { translate, useTranslationVersion } from "../services/translateService";
import theme from "../styles/theme";
import log from "../utils/logService";
import { getItem, saveItem } from "../utils/storageService";
import { emailRegex, passwordRegex, usernameRegex } from "../utils/validationRegex";

const t = (key: string, fallback: string) => {
  const value = translate(key);
  return value === key ? fallback : value;
};

export default function LoginScreen({ navigation }: any) {
  useTranslationVersion();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { showAppAlert, appAlertDialog } = useAppAlert(t("common.ok", "OK"));

  const validate = () => {
    let valid = true;
    const newErrors = { identifier: "", password: "" };

    if (!identifier.trim()) {
      newErrors.identifier = translate("login.error.identifier_required");
      valid = false;
    } else if (!(emailRegex.test(identifier) || usernameRegex.test(identifier))) {
      newErrors.identifier = translate("login.error.identifier_invalid");
      valid = false;
    }

    if (!password) {
      newErrors.password = translate("login.error.password_required");
      valid = false;
    } else if (!passwordRegex.test(password)) {
      // Keep existing relaxed validation behavior.
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const pushToken = await getItem<string>("pushToken");
      const data = await login({
        login: identifier,
        password,
        tokenPhone: pushToken,
      });

      await saveItem("userData", data);
      log.info("Login success:", data);
      navigation.navigate("MainApp");
    } catch (error: any) {
      log.error("Login error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);

    try {
      const pushToken = await getItem<string>("pushToken");
      const data = await signInWithGoogle(pushToken);

      await saveItem("userData", data);
      log.info("Google login success:", data);
      navigation.navigate("MainApp");
    } catch (error: any) {
      if (isGoogleCancelled(error)) {
        log.info("Google sign-in cancelled by user");
        return;
      }

      const message = error?.response?.data?.error || error?.message || t("auth.google_error", "Unable to sign in with Google.");
      log.error("Google login error:", error.response?.data || error.message);
      showAppAlert(t("auth.google_title", "Google sign-in"), message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title={`${translate("login.title")} 👋`}
      subtitle={translate("login.subtitle")}
      badge={translate("login.badge")}
    >
      <Text style={styles.label}>{translate("login.identifier_placeholder")}</Text>
      <TextInput
        placeholder={translate("login.identifier_placeholder")}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        placeholderTextColor={theme.textMuted}
        style={styles.input}
      />
      {errors.identifier ? <Text style={styles.errorText}>{errors.identifier}</Text> : null}

      <Text style={styles.label}>{translate("login.password_placeholder")}</Text>
      <TextInput
        placeholder={translate("login.password_placeholder")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={theme.textMuted}
        style={styles.input}
      />
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, (loading || googleLoading) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading || googleLoading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? `${translate("loading")}...` : translate("login.login_button")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}
      >
        <Text style={styles.googleButtonText}>
          {googleLoading ? `${translate("loading")}...` : `🌐 ${translate("auth.google_button")}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Register")}>
        <Text style={styles.secondaryButtonText}>{translate("login.register_link")}</Text>
      </TouchableOpacity>

      {appAlertDialog}
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
    backgroundColor: theme.primary,
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
    color: theme.secondary,
    fontWeight: "700",
    fontSize: 14,
  },
});
