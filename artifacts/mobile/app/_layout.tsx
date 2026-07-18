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
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BiometricLockScreen } from '@/components/BiometricLockScreen';
import { AuthProvider } from '@/context/AuthContext';
import { BiometricProvider, useBiometric } from '@/context/BiometricContext';
import { useColors } from '@/hooks/useColors';
import { queryClient } from '@/lib/queryClient';

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

/**
 * BiometricGate — prevents authenticated content from rendering until the
 * biometric lock decision has been made.
 *
 * While initializing (SecureStore or auth still loading):
 *   → Shows a blank screen matching the app background. No content flash.
 *
 * When locked:
 *   → Shows BiometricLockScreen, which covers the entire display.
 *   → RootLayoutNav (and all routes inside it) never mounts.
 *
 * When unlocked:
 *   → Shows RootLayoutNav normally.
 */
function BiometricGate({ children }: { children: React.ReactNode }) {
  const { isLocked, initializing } = useBiometric();
  const colors = useColors();

  if (initializing) {
    // Blank screen — same background color as the rest of the app.
    // This window lasts only until SecureStore and auth INITIAL_SESSION both resolve.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (isLocked) {
    return <BiometricLockScreen />;
  }

  return <>{children}</>;
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
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/*
             * BiometricProvider must be inside AuthProvider so it can read
             * the current user ID from useAuth().
             * BiometricGate must be inside BiometricProvider to consume the
             * context, and wraps all navigation so it can block rendering.
             */}
            <BiometricProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <BiometricGate>
                    <RootLayoutNav />
                  </BiometricGate>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </BiometricProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
