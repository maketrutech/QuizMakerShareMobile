import axios from "axios";
import { API_URL } from "../config/api";
import log from "../utils/logService";
import { getItem } from "../utils/storageService";
import apiClient from "../config/apiClient";
import * as RNLocalize from 'react-native-localize';


const URI = `${API_URL}/themes`;

export const loadThemes = async () => {
  try {
    log.info(`${URI}`);
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || 'en';
    const res = await apiClient.get(`${URI}/${deviceLanguage}`);
    return res.data;
  } catch (error) {
    log.error("Error loading themes:", error);
  }
};
