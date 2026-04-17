
import axios from "axios";
import { API_URL } from "../config/api";
import log from "../utils/logService";
import { getItem } from "../utils/storageService";
import apiClient from "../config/apiClient";
import * as RNLocalize from 'react-native-localize';


const URI = `${API_URL}/quiz`;

export const loadQuiz = async (themeId: Number, page: Number, limit: Number, searchText: string = ``) => {
  try {
    searchText = searchText ? `&searchText=${searchText}` : ``;
    log.info(`${URI}`);
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || 'en';console.log(`${URI}/${themeId}/${deviceLanguage}?page=${page}&limit=${limit}${searchText}`);
    const res = await apiClient.get(`${URI}/theme/${themeId}/lang/${deviceLanguage}?page=${page}&limit=${limit}`);console.log(res);
    return res.data;
  } catch (error) {
    log.error("Error loading themes:", error);
  }
};

export const saveQuiz = async (quizData: Object) => {
  try {
    log.info(`${URI}`);
    const res = await apiClient.post(`${URI}`, quizData);
    return res.data;
  } catch (error) {
    log.error("Error loading themes:", error);
  }
};

export const loadQuizById = async (quizId: number) => {
  try {
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || 'en';
    const res = await apiClient.get(`${URI}/${quizId}?lang=${deviceLanguage}`);
    return res.data;
  } catch (error) {
    log.error("Error loading quiz by id:", error);
  }
};



