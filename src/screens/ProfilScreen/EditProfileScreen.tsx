import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassHeader from "../../components/GlassHeader";
import AppDialog from "../../components/AppDialog";
import theme from "../../styles/theme";
import { setAppLanguage, translate, useTranslationVersion } from "../../services/translateService";
import { getItem, saveItem } from "../../utils/storageService";
import { emailRegex, passwordRegex, usernameRegex } from "../../utils/validationRegex";
import { avatarNames, getAvatarSource } from "../../utils/avatarOptions";
import { changePassword, updateProfile } from "../../services/userService";

type StoredUserData = {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    language?: string;
  };
};

const LANGUAGE_OPTIONS = [
  { code: "en", labelKey: "language.option.en", fallback: "English" },
  { code: "fr", labelKey: "language.option.fr", fallback: "Français" },
  { code: "es", labelKey: "language.option.es", fallback: "Español" },
  { code: "hi", labelKey: "language.option.hi", fallback: "हिन्दी" },
  { code: "ar", labelKey: "language.option.ar", fallback: "العربية" },
];

export default function EditProfileScreen({ navigation }: any) {
  useTranslationVersion();
  const [userData, setUserData] = useState<StoredUserData | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("avatar1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarDialogVisible, setAvatarDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [language, setLanguage] = useState("en");
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const stored = await getItem<StoredUserData>("userData");

      if (!stored?.user) {
        Alert.alert(translate("common.error"), translate("profile.error.load_failed"));
        navigation.goBack();
        return;
      }

      setUserData(stored);
      setUsername(stored.user.username || "");
      setEmail(stored.user.email || "");
      setAvatar(stored.user.avatar || "avatar1");
      setLanguage(stored.user.language || "en");
      setLoading(false);
    };

    loadProfile();
  }, [navigation]);

  const handleSaveProfile = async () => {
    if (!userData?.user?.id) {
      Alert.alert(translate("common.error"), translate("profile.error.load_failed"));
      return;
    }

    if (!usernameRegex.test(username.trim())) {
      Alert.alert(translate("common.error"), translate("profile.error.invalid_username"));
      return;
    }

    if (!emailRegex.test(email.trim())) {
      Alert.alert(translate("common.error"), translate("profile.error.invalid_email"));
      return;
    }

    setSaving(true);
    try {
      const response = await updateProfile(userData.user.id, {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        avatar,
        language,
      });

      const nextUserData = {
        ...userData,
        user: {
          ...userData.user,
          ...(response?.user || {}),
        },
      };

      await saveItem("userData", nextUserData);
      await saveItem("selectedLanguage", language);
      await setAppLanguage(language);
      setUserData(nextUserData);
      Alert.alert(
        translate("common.success"),
        translate("profile.success.updated"),
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(translate("common.error"), error?.response?.data?.error || translate("profile.error.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(translate("common.error"), translate("profile.error.password_required"));
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      Alert.alert(translate("common.error"), translate("profile.error.password_rule"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(translate("common.error"), translate("profile.error.password_mismatch"));
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordDialogVisible(false);
      Alert.alert(translate("common.success"), translate("profile.success.password_updated"));
    } catch (error: any) {
      Alert.alert(translate("common.error"), error?.response?.data?.error || translate("profile.error.password_failed"));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <GlassHeader
          title={translate("profile.edit_profile")}
          subtitle={translate("profile.edit_profile_subtitle")}
          onBackPress={() => navigation.goBack()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => setAvatarDialogVisible(true)} activeOpacity={0.9}>
            <View style={styles.avatarGradientShell}>
              <Image source={getAvatarSource(avatar)} style={styles.avatarImage} />
            </View>
            <Text style={styles.avatarName}>{translate("profile.avatar")}</Text>
            <Text style={styles.avatarHint}>{translate("profile.tap_to_change_avatar")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{translate("profile.username")}</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder={translate("profile.username")}
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>{translate("profile.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={translate("profile.email")}
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setLanguageDialogVisible(true)}>
            <Text style={styles.secondaryButtonText}>
              {translate("profile.language") === "profile.language" ? "Language" : translate("profile.language")}: {(translate(LANGUAGE_OPTIONS.find((item) => item.code === language)?.labelKey) !== LANGUAGE_OPTIONS.find((item) => item.code === language)?.labelKey ? translate(LANGUAGE_OPTIONS.find((item) => item.code === language)?.labelKey) : LANGUAGE_OPTIONS.find((item) => item.code === language)?.fallback) || "English"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setPasswordDialogVisible(true)}>
            <Text style={styles.secondaryButtonText}>{translate("profile.change_password")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={handleSaveProfile} disabled={saving}>
            <Text style={styles.primaryButtonText}>
              {saving ? `${translate("loading")}...` : translate("profile.save_changes")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppDialog
        visible={avatarDialogVisible}
        title={translate("profile.avatar_dialog_title")}
        subtitle={translate("profile.avatar_dialog_subtitle")}
        onClose={() => setAvatarDialogVisible(false)}
      >
        <View style={styles.avatarGrid}>
          {avatarNames.map((item) => {
            const isSelected = avatar === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                onPress={() => {
                  setAvatarDialogVisible(false);
                  setAvatar(item);
                }}
              >
                <Image source={getAvatarSource(item)} style={styles.avatarOptionImage} />
                <Text style={[styles.avatarOptionText, isSelected && styles.avatarOptionTextSelected]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppDialog>

      <AppDialog
        visible={languageDialogVisible}
        title={translate("profile.language") === "profile.language" ? "Choose language" : translate("profile.language")}
        subtitle={translate("profile.language_subtitle") === "profile.language_subtitle" ? "Select your app language" : translate("profile.language_subtitle")}
        onClose={() => setLanguageDialogVisible(false)}
      >
        <View style={styles.languageList}>
          {LANGUAGE_OPTIONS.map((item) => {
            const isSelected = language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
                onPress={() => {
                  setLanguage(item.code);
                  setLanguageDialogVisible(false);
                }}
              >
                <Text style={[styles.languageOptionText, isSelected && styles.languageOptionTextSelected]}>
                  {translate(item.labelKey) !== item.labelKey ? translate(item.labelKey) : item.fallback}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppDialog>

      <AppDialog
        visible={passwordDialogVisible}
        title={translate("profile.password_dialog_title")}
        subtitle={translate("profile.password_dialog_subtitle")}
        onClose={() => setPasswordDialogVisible(false)}
      >
        <Text style={styles.label}>{translate("profile.current_password")}</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          style={styles.input}
          placeholder={translate("profile.current_password")}
          placeholderTextColor={theme.textMuted}
        />

        <Text style={styles.label}>{translate("profile.new_password")}</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          style={styles.input}
          placeholder={translate("profile.new_password")}
          placeholderTextColor={theme.textMuted}
        />

        <Text style={styles.label}>{translate("profile.confirm_password")}</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          placeholder={translate("profile.confirm_password")}
          placeholderTextColor={theme.textMuted}
        />

        <TouchableOpacity
          style={[styles.primaryButton, passwordLoading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={passwordLoading}
        >
          <Text style={styles.primaryButtonText}>
            {passwordLoading ? `${translate("loading")}...` : translate("profile.validate")}
          </Text>
        </TouchableOpacity>
      </AppDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4efff",
  },
  headerArea: {
    backgroundColor: theme.primary,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusCard,
    borderWidth: 1.2,
    borderColor: "#d9cef9",
    padding: 18,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    opacity: 1,
  },
  avatarWrap: {
    alignItems: "center",
  },
  avatarGradientShell: {
    width: 118,
    height: 118,
    borderRadius: 59,
    padding: 4,
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarImage: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  avatarName: {
    color: theme.black,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  avatarHint: {
    color: theme.black,
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  label: {
    color: theme.black,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: theme.white,
    borderWidth: 1.2,
    borderColor: "#d8cff8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.black,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: theme.white,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 14,
    backgroundColor: "#fff4f8",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: theme.secondary,
  },
  secondaryButtonText: {
    color: theme.secondary,
    fontWeight: "800",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  languageList: {
    gap: 10,
  },
  languageOption: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.white,
  },
  languageOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: "#efeaff",
  },
  languageOptionText: {
    color: theme.black,
    fontSize: 15,
    fontWeight: "700",
  },
  languageOptionTextSelected: {
    color: theme.primary,
  },
  avatarOption: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
  },
  avatarOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: "#efeaff",
  },
  avatarOptionImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  avatarOptionText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  avatarOptionTextSelected: {
    color: theme.primary,
  },
});