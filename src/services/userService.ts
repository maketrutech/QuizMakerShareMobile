import apiClient from "../config/apiClient";
import log from "../utils/logService";
import { API_URL } from "../config/api";

const URI = `${API_URL}/users`;
const AUTH_URI = `${API_URL}/auth`;

export const updateProfile = async (userId: number, payload: { username: string; email: string; avatar: string }) => {
  try {
    const response = await apiClient.put(`${URI}/${userId}`, payload);
    return response.data;
  } catch (error) {
    log.error("Error updating profile:", error);
    throw error;
  }
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  try {
    const response = await apiClient.post(`${AUTH_URI}/change-password`, payload);
    return response.data;
  } catch (error) {
    log.error("Error changing password:", error);
    throw error;
  }
};
