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
  MyQuizScreen: undefined;
  CreateQuizScreen: undefined;
  EditQuizScreen: { quizId: number };
};

export type ThemeStackParamList = {
  ThemeScreen: undefined;
  QuizScreen: { themeId: number }; 
  PlayQuizScreen: { quizId: number };
};