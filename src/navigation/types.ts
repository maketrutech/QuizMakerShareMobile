export type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  Login: undefined;
  MainApp: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeConnectedMain: undefined;
};

export type ProfilStackParamList = {
  ProfileScreenMain: undefined;
  CreateQuizScreen: undefined; 
};

export type ThemeStackParamList = {
  ThemeScreen: undefined;
  QuizScreen: { themeId: number }; 
  PlayQuizScreen: { quizId: number };
};