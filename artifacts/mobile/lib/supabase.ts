import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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
        detectSessionInUrl: false,
        // PKCE is the correct flow for React Native (supabase-js v2).
        // It returns a `code` query param rather than tokens in the URL fragment.
        // exchangeCodeForSession() in AuthContext exchanges the code for a session.
        flowType: 'pkce',
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

export const supabaseUrlRaw = supabaseUrl;
