export type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  Login: undefined;
  MainApp: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeConnectedMain: undefined;
  HomeQuizScreen: { themeId: number }; // 👈 expects a themeId param
};