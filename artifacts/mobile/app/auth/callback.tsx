import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Web-only OAuth callback route — /auth/callback
 *
 * After Google sign-in, Supabase redirects the browser here with a PKCE
 * ?code= query param. We exchange that code for a session, then push to /.
 * On native, this file is never navigated to (deep links go via Linking).
 */
export default function AuthCallback() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function exchange() {
      try {
        // window.location.href contains the full URL including ?code=…
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.warn('[AuthCallback] exchangeCodeForSession error:', error.message);
          setErrorMsg(error.message);
          return;
        }
        // Session established — onAuthStateChange in AuthContext picks it up.
        // Navigate to root; index.tsx will redirect to tabs or onboarding.
        router.replace('/');
      } catch (e: any) {
        console.warn('[AuthCallback] unexpected error:', e?.message);
        setErrorMsg(e?.message ?? 'Unknown error');
      }
    }

    exchange();
  }, []);

  if (errorMsg) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#e53e3e', textAlign: 'center', fontSize: 14 }}>
          Sign-in failed: {errorMsg}
        </Text>
        <Text
          style={{ marginTop: 16, color: '#3182ce', fontSize: 14 }}
          onPress={() => router.replace('/(auth)/login')}
        >
          Back to login
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
