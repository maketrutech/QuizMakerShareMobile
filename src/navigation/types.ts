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
  AIQuizCreatorScreen: undefined;
  EditQuizScreen: { quizId: number };
  EditProfileScreen: undefined;
  QuizPlayersLeaderboardScreen: { quizId: number; quizName?: string; questionCount?: number };
};

export type ThemeStackParamList = {
  ThemeScreen: undefined;
  QuizScreen: { themeId: number }; 
  PlayQuizScreen: { quizId: number };
};