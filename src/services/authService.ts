// services/authService.js
import axios from "axios";
import { API_URL } from "../config/api";
import log from "../utils/logService";

const URI = `${API_URL}/auth`;

export const register = async (userData: any) => {
  try {
    log.info(`${URI}/register`);
    const response = await axios.post(`${URI}/register`, userData);
    return response.data;
  } catch (error: any) {
    log.error("Erreur API register:", error.response?.data || error.message);
    throw error;
  }
};

export const login = async (userData: any) => {
  try {
    log.info(`${URI}/login`);
    const response = await axios.post(`${URI}/login`, userData);
    return response.data;
  } catch (error: any) {
    log.error("Erreur API login:", error.response?.data || error.message);
    throw error;
  }
};

export const googleLogin = async (userData: any) => {
  try {
    log.info(`${URI}/google`);
    const response = await axios.post(`${URI}/google`, userData);
    return response.data;
  } catch (error: any) {
    log.error("Erreur API google login:", error.response?.data || error.message);
    throw error;
  }
};
