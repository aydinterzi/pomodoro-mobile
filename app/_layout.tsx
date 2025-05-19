import { Stack } from "expo-router";
import React from "react";
import { MD3LightTheme, Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#FF4785",
    primaryContainer: "#FFDBDE",
    secondary: "#6200EA",
    secondaryContainer: "#E8DDFF",
    background: "#FFFFFF",
    surface: "#F8F9FA",
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
