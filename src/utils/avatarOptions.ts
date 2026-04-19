export const avatarImages = {
  avatar1: require("../assets/images/avatar/avatar1.png"),
  avatar2: require("../assets/images/avatar/avatar2.png"),
  avatar3: require("../assets/images/avatar/avatar3.png"),
  avatar4: require("../assets/images/avatar/avatar4.png"),
  avatar5: require("../assets/images/avatar/avatar5.png"),
  avatar6: require("../assets/images/avatar/avatar6.png"),
  avatar7: require("../assets/images/avatar/avatar7.png"),
  avatar8: require("../assets/images/avatar/avatar8.png"),
  avatar9: require("../assets/images/avatar/avatar9.png"),
} as const;

export const avatarNames = Object.keys(avatarImages) as Array<keyof typeof avatarImages>;

export const getAvatarSource = (avatarName?: string) => {
  if (avatarName && avatarName in avatarImages) {
    return avatarImages[avatarName as keyof typeof avatarImages];
  }

  return avatarImages.avatar1;
};
