import auth from "@react-native-firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import log from "../utils/logService";
import { googleLogin } from "./authService";

const GOOGLE_WEB_CLIENT_ID = "607199250947-pg4rodjletclh8v980kim2e1oovbrh9a.apps.googleusercontent.com";

let isConfigured = false;

export const configureGoogleSignIn = () => {
  if (isConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["email", "profile"],
    offlineAccess: false,
  });

  isConfigured = true;
};

export const signInWithGoogle = async (pushToken?: string | null) => {
  configureGoogleSignIn();

  if (GOOGLE_WEB_CLIENT_ID.startsWith("YOUR_FIREBASE_WEB_CLIENT_ID")) {
    throw new Error("Google sign-in is not configured yet. Add your Firebase Web Client ID in googleAuthService.ts.");
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const signInResult: any = await GoogleSignin.signIn();
  const googleIdToken = signInResult?.data?.idToken || signInResult?.idToken;

  if (!googleIdToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  let firebaseIdToken: string | null = null;

  try {
    const googleCredential = auth.GoogleAuthProvider.credential(googleIdToken);
    await auth().signInWithCredential(googleCredential);
    firebaseIdToken = (await auth().currentUser?.getIdToken()) || null;
    log.info("Google sign-in succeeded with Firebase");
  } catch (error: any) {
    log.warn("Firebase credential exchange failed, falling back to Google token verification", error?.message || error);
  }

  return googleLogin({
    idToken: firebaseIdToken,
    googleIdToken,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    tokenPhone: pushToken,
  });
};

export const isGoogleCancelled = (error: any) => {
  return error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === "SIGN_IN_CANCELLED";
};
