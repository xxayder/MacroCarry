import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate both values before attempting to call createClient.
// createClient throws at module-load time if the URL is missing or not HTTP/HTTPS.
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
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

// Export the raw values so SetupRequired can show helpful diagnostics
export const supabaseUrlRaw = supabaseUrl;
