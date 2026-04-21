import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AppDialog from "../components/AppDialog";
import AuthShell from "../components/AuthShell";
import useAppAlert from "../components/useAppAlert";
import { register } from "../services/authService";
import { CountryItem, getCountries, getCountryFlagSource } from "../services/countryService";
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

export default function RegisterScreen({ navigation }: any) {
  useTranslationVersion();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);
  const [countryDialogVisible, setCountryDialogVisible] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryDialogLoading, setCountryDialogLoading] = useState(false);
  const [errors, setErrors] = useState({ username: "", email: "", password: "", country: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { showAppAlert, appAlertDialog } = useAppAlert(t("common.ok", "OK"));

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [token, countryList] = await Promise.all([getItem<string>("pushToken"), getCountries()]);
        setPushToken(token);
        setCountries(countryList);
      } catch (error: any) {
        log.error("Register initial load error:", error?.response?.data || error?.message || error);
        showAppAlert(t("common.error", "Error"), t("register.error.country_load_failed", "Unable to load countries."));
      } finally {
        setCountriesLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const openCountryDialog = () => {
    if (countriesLoading || countryDialogLoading) {
      return;
    }

    setCountryDialogLoading(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCountryDialogVisible(true);
        setCountryDialogLoading(false);
      });
    });
  };

  const validate = () => {
    let valid = true;
    const newErrors = { username: "", email: "", password: "", country: "" };

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

    if (!selectedCountry?.id) {
      newErrors.country = t("register.error.country_required", "Country is required.");
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
        countryId: selectedCountry!.id,
      });

      navigation.navigate("Home");
    } catch (error: any) {
      log.error("Register error:", error.response?.data || error.message);
      showAppAlert(t("common.error", "Error"), error?.response?.data?.error || t("register.error.generic", "Unable to register."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!selectedCountry?.id) {
      setErrors((current) => ({
        ...current,
        country: t("register.error.country_required", "Country is required."),
      }));
      return;
    }

    setGoogleLoading(true);

    try {
      const data = await signInWithGoogle(pushToken, selectedCountry.id);
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
      showAppAlert(t("auth.google_title", "Google sign-in"), message);
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

      <Text style={styles.label}>{t("register.country_label", "Country")}</Text>
      <TouchableOpacity
        style={[styles.selectButton, (countriesLoading || countryDialogLoading) && styles.buttonDisabled]}
        onPress={openCountryDialog}
        disabled={countriesLoading || countryDialogLoading}
      >
        <View style={styles.selectContentRow}>
          {selectedCountry ? (
            <View style={styles.selectContent}>
              <Image
                source={getCountryFlagSource(selectedCountry.flagUrl, selectedCountry.key)}
                style={styles.flagImage}
              />
              <Text style={styles.selectText}>{selectedCountry.name}</Text>
            </View>
          ) : (
            <Text style={styles.selectPlaceholder}>
              {countriesLoading ? t("loading", "Loading") : countryDialogLoading ? t("register.country_opening", "Opening countries...") : t("register.country_placeholder", "Choose your country")}
            </Text>
          )}

          {countryDialogLoading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
        </View>
      </TouchableOpacity>
      {errors.country ? <Text style={styles.errorText}>{errors.country}</Text> : null}

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

      <AppDialog
        visible={countryDialogVisible}
        title={t("register.country_dialog_title", "Choose your country")}
        subtitle={t("register.country_dialog_subtitle", "Select a country with its flag.")}
        onClose={() => setCountryDialogVisible(false)}
      >
        <View style={styles.countryList}>
          {countries.map((country) => {
            const isSelected = selectedCountry?.id === country.id;

            return (
              <TouchableOpacity
                key={country.id}
                style={[styles.countryOption, isSelected && styles.countryOptionSelected]}
                onPress={() => {
                  setSelectedCountry(country);
                  setCountryDialogVisible(false);
                  setErrors((current) => ({ ...current, country: "" }));
                }}
              >
                <Image source={getCountryFlagSource(country.flagUrl, country.key)} style={styles.countryOptionFlag} />
                <Text style={[styles.countryOptionText, isSelected && styles.countryOptionTextSelected]}>{country.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppDialog>

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
  selectButton: {
    backgroundColor: theme.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectText: {
    color: theme.black,
    fontSize: 14,
    fontWeight: "600",
  },
  selectPlaceholder: {
    color: theme.textMuted,
    fontSize: 14,
    flex: 1,
  },
  flagImage: {
    width: 24,
    height: 18,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: theme.white,
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
  countryList: {
    gap: 10,
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceSoft,
  },
  countryOptionSelected: {
    borderColor: theme.secondary,
    backgroundColor: theme.surface,
  },
  countryOptionFlag: {
    width: 28,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: theme.white,
  },
  countryOptionText: {
    color: theme.black,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  countryOptionTextSelected: {
    color: theme.secondary,
  },
});

