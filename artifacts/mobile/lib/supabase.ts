import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function isValidUrl(s: string | undefined): s is string {
  if (!s) return false;
  return s.startsWith('https://') || s.startsWith('http://');
}

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web: let Supabase auto-detect the session from the URL hash/code
        //      after the OAuth redirect lands on /auth/callback.
        // Native: disable so the router doesn't try to parse deep-link URLs.
        detectSessionInUrl: Platform.OS === 'web',
        // supabase-js v2 defaults to PKCE even without explicit config.
        // Expo Go lacks WebCrypto so PKCE falls back to 'plain' challenge,
        // which Supabase rejects as an invalid flow state.
        // Force 'implicit' on native (tokens in URL fragment, no crypto needed).
        // Keep 'pkce' on web where localStorage and WebCrypto are available.
        flowType: Platform.OS === 'web' ? 'pkce' : 'implicit',
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

export const supabaseUrlRaw = supabaseUrl;
