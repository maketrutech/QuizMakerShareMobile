// apiClient.ts
import axios from "axios";
import { API_URL } from "../config/api";
import { getItem } from "../utils/storageService";

const apiClient = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token automatically
apiClient.interceptors.request.use(
  async (config) => {
    const userData: any = await getItem("userData");
    if (userData?.token) {
      config.headers.Authorization = `Bearer ${userData.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
