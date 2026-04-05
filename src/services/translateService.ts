import axios from "axios";
import { API_URL } from "../config/api";
import log from "../utils/logService";
import * as RNLocalize from 'react-native-localize';



const URI = `${API_URL}/translations`;

let translations: any = {};

export const loadTranslations = async () => {
  try {
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || 'en';
    log.info('deviceLanguage : ', deviceLanguage);
    const res = await axios.get(`${URI}/${deviceLanguage}`);
    translations = res.data.reduce((acc:any, item:any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  } catch (error) {
    log.error('Error loading translations:', error);
  }
};

export const translate = (key: any) => {
  return translations[key] || key; // fallback to key if missing
};
