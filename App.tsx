import React, { useEffect, useState } from "react";
import { OneSignal } from "react-native-onesignal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import LoadingScreen from "./src/screens/LoadingScreen";
import { loadTranslations, useTranslationVersion } from "./src/services/translateService";
import { configureGoogleSignIn } from "./src/services/googleAuthService";
import { syncPushToken } from "./src/services/userService";
import { getItem, saveItem } from "./src/utils/storageService";

export default function App() {
  const [ready, setReady] = useState(false);
  useTranslationVersion();

  useEffect(() => {
    OneSignal.initialize("ad0fddf5-1bdb-46dd-93c5-b8e3c0003585");
    OneSignal.Debug.setLogLevel(6);
    OneSignal.Notifications.requestPermission(true);

    const persistPushToken = async (token: string | null) => {
      if (!token) {
        return;
      }

      console.log("Current User Push Token:", token);
      await saveItem("pushToken", token);

      const userData: any = await getItem("userData");
      if (userData?.user?.id && token !== userData?.user?.token_phone) {
        try {
          await syncPushToken(Number(userData.user.id), token);
          await saveItem("userData", {
            ...userData,
            user: {
              ...userData.user,
              token_phone: token,
            },
          });
        } catch (error) {
          console.log("Push token sync failed:", error);
        }
      }
    };

    const bootstrapApp = async () => {
      configureGoogleSignIn();

      const currentToken = await OneSignal.User.pushSubscription.getTokenAsync();
      await persistPushToken(currentToken);

      await loadTranslations();
      setReady(true);
    };

    bootstrapApp();

    const onSubChange = async (event: any) => {
      console.log("Push Subscription Changed:", event);
      const newToken = await OneSignal.User.pushSubscription.getTokenAsync();
      if (newToken) {
        console.log("New User Push Token:", newToken);
        await persistPushToken(newToken);
      }
    };

    const onForeground = (event: any) => {
      console.log("Notif en foreground:", event);
      event.preventDefault();
      event.notification.display();
    };

    const onClick = (event: any) => {
      console.log("Notif cliquée:", event);
    };

    OneSignal.User.pushSubscription.addEventListener("change", onSubChange);
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", onForeground);
    OneSignal.Notifications.addEventListener("click", onClick);

    return () => {
      OneSignal.User.pushSubscription.removeEventListener("change", onSubChange);
      OneSignal.Notifications.removeEventListener("foregroundWillDisplay", onForeground);
      OneSignal.Notifications.removeEventListener("click", onClick);
    };
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
