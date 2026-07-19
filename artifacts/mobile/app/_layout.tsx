import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { queryClient } from '@/lib/queryClient';
import { captureException, initSentry } from '@/lib/sentry';

initSentry();

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-food"
        options={{ presentation: 'modal', headerShown: false, title: 'Add Food' }}
      />
      <Stack.Screen
        name="scanner"
        options={{ presentation: 'fullScreenModal', headerShown: false, title: 'Scan Barcode' }}
      />
      <Stack.Screen
        name="serving-picker"
        options={{ title: 'Serving Size', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="food-search"
        options={{ presentation: 'modal', headerShown: false, title: 'Search Foods' }}
      />
      <Stack.Screen
        name="manual-food"
        options={{ headerShown: false, title: 'Manual Entry' }}
      />
      <Stack.Screen
        name="copy-day"
        options={{ presentation: 'modal', headerShown: false, title: 'Copy Foods' }}
      />
      <Stack.Screen
        name="sharing"
        options={{ headerShown: false, title: 'Share Log' }}
      />
      <Stack.Screen
        name="shared-with-me"
        options={{ headerShown: false, title: 'Shared With Me' }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary onError={(err, stack) => captureException(err, { componentStack: stack })}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
