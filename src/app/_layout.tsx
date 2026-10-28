import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { C, F } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, primary: C.accent, border: C.border },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    LilitaOne_400Regular,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#4a3422' },
          headerTintColor: C.text,
          headerTitleStyle: { fontFamily: F.display, fontSize: 22 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="dig" options={{ title: 'Dig', gestureEnabled: false }} />
        <Stack.Screen name="archive" options={{ title: 'Archive' }} />
        <Stack.Screen name="shafts" options={{ title: 'Shafts' }} />
        <Stack.Screen name="profile" options={{ title: 'Miner' }} />
        <Stack.Screen name="how-to" options={{ title: 'How to dig', presentation: 'modal' }} />
        <Stack.Screen name="party/index" options={{ title: 'TNT Toss' }} />
        <Stack.Screen name="party/local" options={{ title: 'Pass & Play', gestureEnabled: false }} />
        <Stack.Screen name="party/[code]" options={{ title: 'TNT Toss', gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
