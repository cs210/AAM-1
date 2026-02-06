import "@/global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import ConvexClientProvider from "@/providers/ConvexClientProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

function SafeAreaInsetsUpdater() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Uniwind.updateInsets(insets);
  }, [insets]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SafeAreaInsetsUpdater />
        <ConvexClientProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ConvexClientProvider>
        <PortalHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
