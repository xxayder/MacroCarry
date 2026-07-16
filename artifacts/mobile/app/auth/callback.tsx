import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Web-only OAuth callback route — /auth/callback
 *
 * With implicit flow, Supabase redirects here with tokens in the URL fragment:
 *   /auth/callback#access_token=…&refresh_token=…
 *
 * detectSessionInUrl:true (set in lib/supabase.ts for web) tells supabase-js
 * to automatically parse the fragment and establish the session on page load.
 * We just wait for that to complete, then push to /.
 */
export default function AuthCallback() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // detectSessionInUrl:true means supabase-js fires onAuthStateChange with
    // the new session automatically. We just need to redirect once it's done.
    // As a safety net, also check getSession() in case it resolved already.
    const check = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[AuthCallback] getSession error:', error.message);
        setErrorMsg(error.message);
        return;
      }
      if (session) {
        router.replace('/');
      }
    };

    // Give supabase-js a moment to parse the URL fragment and store the session.
    const timer = setTimeout(check, 500);

    // Also listen for auth state change as the authoritative signal.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] auth event:', event);
      if (session) {
        clearTimeout(timer);
        router.replace('/');
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
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
