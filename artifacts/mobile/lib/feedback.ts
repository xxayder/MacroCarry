import { Platform } from 'react-native';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface FeedbackPayload {
  user_id: string | null;
  user_email: string | null;
  message: string;
  category: 'bug' | 'suggestion' | 'other';
  device_info: Record<string, string>;
}

export interface CrashReportPayload {
  user_id: string | null;
  user_email: string | null;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  device_info: Record<string, string>;
}

export function getDeviceInfo(): Record<string, string> {
  return {
    platform: Platform.OS,
    version: String(Platform.Version),
  };
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
  const { error } = await supabase.from('feedback').insert({
    user_id: payload.user_id,
    user_email: payload.user_email,
    message: payload.message,
    category: payload.category,
    device_info: payload.device_info,
  });
  if (error) throw error;
}

export async function submitCrashReport(payload: CrashReportPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('crash_reports').insert({
      user_id: payload.user_id,
      user_email: payload.user_email,
      error_message: payload.error_message,
      error_stack: payload.error_stack,
      component_stack: payload.component_stack,
      device_info: payload.device_info,
    });
  } catch {
    // Best-effort — never throw from crash reporter
  }
}
