---
name: Supabase native recovery deep link
description: How to handle Supabase password-recovery deep links on native (Expo) where detectSessionInUrl is false.
---

## The rule
On native, `detectSessionInUrl: false` means supabase-js will NOT auto-parse the recovery URL hash. The app must:
1. Read the full URL via `ExpoLinking.getInitialURL()` (cold start) AND `ExpoLinking.addEventListener('url', …)` (foregrounded)
2. Parse `#access_token`, `refresh_token`, `type` from the fragment manually
3. Validate `type === 'recovery'`
4. Call `supabase.auth.setSession({ access_token, refresh_token })`
5. Surface any error as "link expired/invalid" — never as a technical message

**Why:** supabase-js v2 with `flowType: 'implicit'` puts tokens in the URL fragment, not query params. `detectSessionInUrl: false` prevents the lib from reading Expo's deep-link URL, so manual parsing is the only path.

**How to apply:** Applies to any Expo native screen that handles a Supabase email-link redirect (password reset, magic link, etc.). Web is handled automatically via `detectSessionInUrl: true`.

## Native redirect URL
`mobile://auth/reset-password`
Must be added to Supabase Auth → URL Configuration → Redirect URLs allowlist.

## Web redirect URL
`window.location.origin + '/auth/reset-password'` — selected at runtime via `Platform.OS === 'web'`.
