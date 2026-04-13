import {
  FiraSans_400Regular,
  FiraSans_500Medium,
  FiraSans_600SemiBold,
  FiraSans_700Bold,
  useFonts,
} from "@expo-google-fonts/fira-sans";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import "react-native-gesture-handler";
import "react-native-reanimated";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore duplicate calls during reloads.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    FiraSans_400Regular,
    FiraSans_500Medium,
    FiraSans_600SemiBold,
    FiraSans_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    const TextComponent = Text as typeof Text & { defaultProps?: { style?: unknown } };
    const TextInputComponent = TextInput as typeof TextInput & {
      defaultProps?: { style?: unknown };
    };

    TextComponent.defaultProps = {
      ...TextComponent.defaultProps,
      style: [{ fontFamily: "FiraSans_400Regular" }, TextComponent.defaultProps?.style],
    };

    TextInputComponent.defaultProps = {
      ...TextInputComponent.defaultProps,
      style: [
        { fontFamily: "FiraSans_400Regular" },
        TextInputComponent.defaultProps?.style,
      ],
    };

    SplashScreen.hideAsync().catch(() => {
      // Ignore duplicate calls during fast refresh.
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: Platform.select({
                ios: "default",
                android: "default",
                default: "default",
              }),
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <StatusBar style="dark" />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
