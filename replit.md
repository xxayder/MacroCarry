# MacroCarry

A production-ready food tracking mobile app (similar to MyFitnessPal) built with Expo React Native, Supabase, and Open Food Facts API.

## Run & Operate

- Expo workflow starts automatically via the `artifacts/mobile: expo` workflow
- Scan the QR code in the Replit URL bar menu to test on a physical device with Expo Go

## Stack

- **Frontend**: Expo React Native (SDK 54), TypeScript, Expo Router v6
- **Backend/DB**: Supabase (PostgreSQL + Auth + Row Level Security)
- **API**: Open Food Facts (free, no key required)
- **State**: React Query (server state) + React Context (auth)
- **Icons**: @expo/vector-icons (Feather), expo-symbols (iOS)
- **Fonts**: Inter (400/500/600/700) via @expo-google-fonts/inter

## Where things live

- `artifacts/mobile/` — the Expo app
- `artifacts/mobile/app/` — all screens (Expo Router file-based routing)
- `artifacts/mobile/components/` — reusable UI components
- `artifacts/mobile/context/AuthContext.tsx` — Google OAuth + Supabase session management
- `artifacts/mobile/lib/supabase.ts` — Supabase client (lazy-initialized, safe with missing env vars)
- `artifacts/mobile/lib/openFoodFacts.ts` — barcode lookup + text search
- `artifacts/mobile/lib/utils.ts` — date helpers, carryover calculation
- `artifacts/mobile/constants/colors.ts` — design tokens (dark + light theme)
- `artifacts/mobile/types/index.ts` — all TypeScript interfaces
- `artifacts/mobile/README.md` — full Supabase setup + SQL migration guide

## Required Environment Variables

Set in Replit Secrets:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Architecture decisions

- **Supabase-direct**: The Expo app talks directly to Supabase (no Express API server needed). The existing api-server artifact is unused by this app.
- **Lazy Supabase init**: `createClient` is only called when env vars are present (throws otherwise). App shows a setup screen instead of crashing.
- **Carryover**: Calculated from past 30 days of food_logs via a single Supabase query. Positive carryover = extra available calories; negative = you over-ate.
- **OAuth flow**: `supabase.auth.signInWithOAuth` → `expo-web-browser` → extract `access_token`/`refresh_token` from redirect URL hash → `supabase.auth.setSession`.
- **Sharing/RLS**: Row Level Security policies on `food_logs` allow reads by users whose email is in `share_permissions`.

## Product

- **Today tab**: Calorie ring (SVG) showing eaten vs adjusted goal (goal + carryover), macro bars, extended macros (fiber/sugar/sodium), 4 meal sections
- **Diary tab**: Browse any past date's full log (read-only)
- **Weekly tab**: 7-day calorie bar chart + averages vs goals
- **Settings tab**: Edit all goals, toggle carryover, manage sharing
- **Add food flow**: Search (Open Food Facts text search) → Scan (barcode) → Manual entry → Copy from previous day
- **Scanner**: Camera-based EAN/UPC barcode scanner with manual fallback

## User preferences

_Populate as needed._

## Gotchas

- `expo-camera` must be pinned to `~17.0.10` for Expo SDK 54 (not the latest 56.x)
- Supabase redirect URL for OAuth must be `mobile://` (matches app.json scheme)
- Add `mobile://` to allowed redirect URLs in Supabase Auth → URL Configuration
- NativeTabs (liquid glass) used on iOS 26+; falls back to classic Tabs with BlurView
- Never hardcode port numbers; PORT is injected by the workflow

## Pointers

- Full Supabase SQL migrations + setup instructions: `artifacts/mobile/README.md`
- Expo skill: `.local/skills/expo/SKILL.md`
