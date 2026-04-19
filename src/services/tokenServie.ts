import { API_URL } from "../config/api";
import log from "../utils/logService";
import { saveItem } from "../utils/storageService";
import apiClient from "../config/apiClient";


const URI = `${API_URL}/check-token`;

export const checkToken = async () => {
  try {
    log.info(`${URI}`);
    await apiClient.get(URI);
    return true;
  } catch {
    saveItem("userData", null);
    return false;
  }
};
