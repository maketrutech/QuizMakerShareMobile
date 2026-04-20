import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config/api";
import log from "../utils/logService";
import * as RNLocalize from "react-native-localize";
import { getItem, saveItem } from "../../src/utils/storageService";

const URI = `${API_URL}/translations`;
const SUPPORTED_LANGUAGES = ["en", "fr", "es", "hi", "ar"];

let translations: any = {};
let currentLanguage = "en";
const languageListeners = new Set<() => void>();

const notifyLanguageChanged = () => {
  languageListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      log.error("Error notifying language listener:", error);
    }
  });
};

export const getCurrentLanguage = async () => {
  const savedLanguage = await getItem<string>("selectedLanguage");
  const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || "en";
  const resolvedLanguage = (savedLanguage || deviceLanguage || "en").toLowerCase();
  return SUPPORTED_LANGUAGES.includes(resolvedLanguage) ? resolvedLanguage : "en";
};

export const loadTranslations = async (preferredLanguage?: string) => {
  try {
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || "en";
    const selectedLanguage = preferredLanguage || await getCurrentLanguage();
    currentLanguage = SUPPORTED_LANGUAGES.includes(selectedLanguage) ? selectedLanguage : "en";

    log.info("deviceLanguage : ", deviceLanguage);
    await saveItem("deviceLanguage", deviceLanguage);
    await saveItem("selectedLanguage", currentLanguage);

    const res = await axios.get(`${URI}/${currentLanguage}`);
    translations = res.data.reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    notifyLanguageChanged();
  } catch (error) {
    log.error("Error loading translations:", error);
  }
};

export const subscribeToLanguageChange = (listener: () => void) => {
  languageListeners.add(listener);

  return () => {
    languageListeners.delete(listener);
  };
};

export const useTranslationVersion = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(() => {
      setVersion((current) => current + 1);
    });

    return unsubscribe;
  }, []);
};

export const setAppLanguage = async (language: string) => {
  const nextLanguage = SUPPORTED_LANGUAGES.includes((language || "").toLowerCase())
    ? (language || "en").toLowerCase()
    : "en";

  await saveItem("selectedLanguage", nextLanguage);
  await loadTranslations(nextLanguage);
  return nextLanguage;
};

export const translate = (key: any) => {
  return translations[key] || key;
};
