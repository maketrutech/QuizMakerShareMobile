
import axios from "axios";
import { API_URL } from "../config/api";
import log from "../utils/logService";
import apiClient from "../config/apiClient";
import * as RNLocalize from 'react-native-localize';

const URI = `${API_URL}/quiz`;

export const loadQuiz = async (themeId: Number, page: Number, limit: Number, searchText: string = ``) => {
  try {
    const searchQuery = searchText ? `&searchText=${encodeURIComponent(searchText)}` : ``;
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || 'en';
    const res = await apiClient.get(`${URI}/theme/${themeId}/lang/${deviceLanguage}?page=${page}&limit=${limit}${searchQuery}`);
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

export const updateQuiz = async (quizId: number, quizData: Object) => {
  try {
    const res = await apiClient.put(`${URI}/${quizId}`, quizData);
    return res.data;
  } catch (error) {
    log.error("Error updating quiz:", error);
  }
};

export const loadMyQuizzes = async (
  page: number = 1,
  limit: number = 10,
  searchText: string = ""
) => {
  try {
    const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode || 'en';
    const searchQuery = searchText ? `&searchText=${encodeURIComponent(searchText)}` : "";
    const res = await apiClient.get(`${URI}/mine?lang=${deviceLanguage}&page=${page}&limit=${limit}${searchQuery}`);
    return res.data;
  } catch (error) {
    log.error("Error loading creator quizzes:", error);
  }
};

export const recordQuizPlay = async (
  quizId: number,
  payload: { score: number; totalQuestions: number }
) => {
  try {
    const res = await apiClient.post(`${URI}/${quizId}/stats/play`, payload);
    return res.data;
  } catch (error) {
    log.error("Error recording quiz play:", error);
  }
};

export const toggleQuizLike = async (quizId: number, isLiked: boolean) => {
  try {
    const res = await apiClient.post(`${URI}/${quizId}/stats/like`, { isLiked });
    return res.data;
  } catch (error) {
    log.error("Error toggling quiz like:", error);
  }
};

