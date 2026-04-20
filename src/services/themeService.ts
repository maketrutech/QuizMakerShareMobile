import { API_URL } from "../config/api";
import log from "../utils/logService";
import apiClient from "../config/apiClient";
import { getCurrentLanguage } from "./translateService";
import { limit as defaultLimit, page as defaultPage } from "../utils/constanteService";

const URI = `${API_URL}/themes`;

export const loadThemes = async (page: number = defaultPage, limit: number = defaultLimit, searchText: string = "") => {
  try {
    log.info(`${URI}`);
    const selectedLanguage = await getCurrentLanguage();
    const query = searchText ? `&searchText=${encodeURIComponent(searchText)}` : "";
    const res = await apiClient.get(`${URI}/${selectedLanguage}?page=${page}&limit=${limit}${query}`);
    return res.data;
  } catch (error) {
    log.error("Error loading themes:", error);
  }
};
