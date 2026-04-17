import React, { useEffect, useState } from "react";
import { OneSignal } from "react-native-onesignal";
import AppNavigator from "./src/navigation/AppNavigator";
import LoadingScreen from "./src/screens/LoadingScreen";
import { saveItem } from "./src/utils/storageService";
import { loadTranslations } from "./src/services/translateService";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    OneSignal.initialize("e4a045fe-0a1c-4c00-bd90-391d75da19f5");
    OneSignal.Debug.setLogLevel(6);
    OneSignal.Notifications.requestPermission(true);

    const bootstrapApp = async () => {
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
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}
