import { ImageSourcePropType } from "react-native";
import { API_URL } from "../config/api";

const DEFAULT_AVATAR = "avatar1";
const backendBaseUrl = API_URL.replace(/\/api\/?$/, "");

export const avatarNames = Array.from({ length: 12 }, (_, index) => `avatar${index + 1}`) as string[];

const normalizeAvatarName = (avatarName?: string | null) => {
  const nextAvatar = String(avatarName || DEFAULT_AVATAR).trim();
  return avatarNames.includes(nextAvatar) ? nextAvatar : DEFAULT_AVATAR;
};

export const getAvatarUrl = (avatarName?: string | null, avatarUrl?: string | null) => {
  const trimmedAvatarUrl = String(avatarUrl || "").trim();

  if (trimmedAvatarUrl) {
    if (/^https?:\/\//i.test(trimmedAvatarUrl)) {
      return trimmedAvatarUrl;
    }

    if (trimmedAvatarUrl.startsWith("/")) {
      return `${backendBaseUrl}${trimmedAvatarUrl}`;
    }
  }

  return `${backendBaseUrl}/public/avatars/${normalizeAvatarName(avatarName)}.png`;
};

export const getAvatarSource = (avatarName?: string | null, avatarUrl?: string | null): ImageSourcePropType => ({
  uri: getAvatarUrl(avatarName, avatarUrl),
});
