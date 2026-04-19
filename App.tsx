import React, { useEffect, useState } from "react";
import { OneSignal } from "react-native-onesignal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import LoadingScreen from "./src/screens/LoadingScreen";
import { loadTranslations } from "./src/services/translateService";
import { configureGoogleSignIn } from "./src/services/googleAuthService";
import { saveItem } from "./src/utils/storageService";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    OneSignal.initialize("ad0fddf5-1bdb-46dd-93c5-b8e3c0003585");
    OneSignal.Debug.setLogLevel(6);
    OneSignal.Notifications.requestPermission(true);

    const bootstrapApp = async () => {
      configureGoogleSignIn();

      const currentToken = await OneSignal.User.pushSubscription.getTokenAsync();
      if (currentToken) {
        console.log("Current User Push Token:", currentToken);
        saveItem("pushToken", currentToken);
      }

      await loadTranslations();
      setReady(true);
    };

    bootstrapApp();

    const onSubChange = async (event: any) => {
      console.log("Push Subscription Changed:", event);
      const newToken = await OneSignal.User.pushSubscription.getTokenAsync();
      if (newToken) {
        console.log("New User Push Token:", newToken);
        saveItem("pushToken", newToken);
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
