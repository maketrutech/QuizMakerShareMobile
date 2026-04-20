import axios from "axios";
import { ImageSourcePropType } from "react-native";
import { API_URL } from "../config/api";
import log from "../utils/logService";

const URI = `${API_URL}/countries`;
const backendBaseUrl = API_URL.replace(/\/api\/?$/, "");

export type CountryItem = {
  id: number;
  key: string;
  name: string;
  flagUrl?: string | null;
};

export const getCountryFlagUrl = (flagUrl?: string | null, countryKey?: string | null) => {
  const trimmedFlagUrl = String(flagUrl || "").trim();

  if (trimmedFlagUrl) {
    if (/^https?:\/\//i.test(trimmedFlagUrl)) {
      return trimmedFlagUrl;
    }

    if (trimmedFlagUrl.startsWith("/")) {
      return `${backendBaseUrl}${trimmedFlagUrl}`;
    }
  }

  const normalizedKey = String(countryKey || "").trim().toLowerCase();
  return normalizedKey ? `${backendBaseUrl}/public/country/${normalizedKey}.png` : "";
};

export const getCountryFlagSource = (flagUrl?: string | null, countryKey?: string | null): ImageSourcePropType => ({
  uri: getCountryFlagUrl(flagUrl, countryKey),
});

export const getCountries = async (): Promise<CountryItem[]> => {
  try {
    const response = await axios.get<CountryItem[]>(URI);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    log.error("Error fetching countries:", error);
    throw error;
  }
};