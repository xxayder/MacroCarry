# MacroCarry — Data & Privacy Audit

Generated: 2026-07-22  
Source: Full codebase inspection of `artifacts/mobile/`

---

## 1. Authentication Data

**Provider:** Supabase Auth (email + password). No third-party OAuth in the current build.

**Collected at sign-up:**
- Email address
- Password (never stored by the app; hashed and held by Supabase)
- Username (stored in `profiles.username`)

**Session persistence:** The Supabase JS client writes the JWT session token to `AsyncStorage` on the device. No other auth data is written locally.

---

## 2. Supabase Tables and Columns

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Supabase auth user ID |
| email | text | User's email address |
| username | text | Chosen at sign-up |
| display_name | text | Optional, user-editable |
| daily_calorie_goal | int | User-set goal |
| protein_goal_g | int | User-set goal |
| carbs_goal_g | int | User-set goal |
| fat_goal_g | int | User-set goal |
| fiber_goal_g | int | User-set goal |
| sugar_goal_g | int | User-set goal |
| sodium_goal_mg | int | User-set goal |
| carryover_enabled | boolean | Feature toggle |
| created_at | timestamptz | Auto |

### `food_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| date | date | Log date |
| meal_type | text | breakfast/lunch/dinner/snacks |
| food_name | text | |
| brand | text | Optional |
| barcode | text | Optional |
| serving_amount | numeric | |
| serving_unit | text | g or oz |
| grams | numeric | Calculated |
| calories | numeric | |
| protein_g | numeric | |
| carbs_g | numeric | |
| fat_g | numeric | |
| fiber_g | numeric | |
| sugar_g | numeric | |
| sodium_mg | numeric | |
| source | text | open_food_facts / manual / copied |
| created_at | timestamptz | Auto |

### `manual_foods`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to auth.users |
| food_name | text | |
| brand | text | Optional |
| barcode | text | Optional |
| serving_size | numeric | |
| serving_unit | text | g or oz |
| calories_per_serving | numeric | |
| protein_g_per_serving | numeric | |
| carbs_g_per_serving | numeric | |
| fat_g_per_serving | numeric | |
| fiber_g_per_serving | numeric | |
| sugar_g_per_serving | numeric | |
| sodium_mg_per_serving | numeric | |
| created_at | timestamptz | Auto |

### `share_permissions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| owner_id | uuid | FK to auth.users |
| shared_with_email | text | Email of viewer |
| created_at | timestamptz | Auto |

### `feedback`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | Nullable |
| user_email | text | Nullable |
| message | text | User-written |
| category | text | bug / suggestion / other |
| device_info | jsonb | `{ platform: "ios"/"android", version: "OS version string" }` |
| created_at | timestamptz | Auto |

### `crash_reports`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | Nullable |
| user_email | text | Nullable |
| error_message | text | |
| error_stack | text | |
| component_stack | text | |
| device_info | jsonb | Same shape as feedback |
| created_at | timestamptz | Auto |

---

## 3. Camera and Barcode Scanning

- **Permission declared:** `android.permission.CAMERA` and iOS `NSCameraUsageDescription`.
- **Purpose:** Barcode scanning only. The camera viewfinder is live; no photos are captured, stored, or transmitted.
- **Barcode values** (e.g. `5449000000996`) are sent to Open Food Facts to look up nutritional data. If the user logs that food, the barcode string is stored in `food_logs.barcode` and/or `manual_foods.barcode`.

---

## 4. Image Access

- `expo-image-picker` is **installed** but **not used** in the current codebase. No photo library access is requested at runtime. The iOS `NSPhotoLibraryUsageDescription` is present in `app.json` but the permission is never triggered.
- No user images are uploaded to any server.

---

## 5. Location Access

- `expo-location` is **installed** but **not used** anywhere in the codebase. No location permission is requested. No location data is collected.

---

## 6. Open Food Facts (Third-Party API)

- **URL:** `https://world.openfoodfacts.org`
- **Data sent:** Barcode number (GET request) or text search query string. No user identifier or personal data is included.
- **User-Agent:** `MacroCarry/1.0 (macrocarry-app)`
- **Data received:** Product name, brand, nutritional values. Stored in `food_logs` only after the user confirms the entry.
- **Open Food Facts privacy policy:** https://world.openfoodfacts.org/privacy

---

## 7. Sentry (Error Monitoring)

- **Package:** `@sentry/react-native` v8
- **Status:** Integrated and initialized via `lib/sentry.ts` → called in `app/_layout.tsx`.
- **Activation:** Only active when `EXPO_PUBLIC_SENTRY_DSN` environment variable is set. If the variable is absent, all Sentry calls are no-ops.
- **Data collected when active:**
  - Unhandled exceptions and manually captured errors
  - Error message, stack trace, component stack
  - App version, release, environment (development/production)
  - Session tracking (enabled via `enableAutoSessionTracking: true`)
  - Performance traces (20% sample rate via `tracesSampleRate: 0.2`)
  - User ID and email (set via `setSentryUser(id, email)` after sign-in)
- **Sentry privacy policy:** https://sentry.io/privacy/

---

## 8. Custom Crash Reporting (Supabase)

- `ErrorFallback.tsx` catches React rendering errors and writes to `crash_reports` table in Supabase.
- Contains: user_id, user_email, error message, stack traces, device platform and OS version.
- This runs independently of Sentry and does not require any additional env var.

---

## 9. Local Device Storage

| Storage | What is stored |
|---|---|
| AsyncStorage | Supabase auth session JWT (managed by supabase-js) |
| SecureStore | Not used |
| SQLite / MMKV | Not used |
| File system | Not used |

---

## 10. Data Shared with Other Users

- A user can grant read-only access to their food logs by adding another user's email in Settings → Share my log.
- The recipient can view that user's `food_logs` rows but cannot modify them (enforced by Row Level Security).
- The sharing relationship stores the **recipient's email** in `share_permissions.shared_with_email`.

---

## 11. Data Retention

- **No automated deletion or expiry is implemented** for any Supabase table.
- Data persists until the user deletes their account (currently a manual/support process) or a developer removes rows directly.

---

## 12. Account Deletion

- **No automated in-app deletion flow exists** in the current build.
- To delete an account, a user must contact the developer, who must manually delete rows from `food_logs`, `manual_foods`, `share_permissions`, `profiles`, `feedback`, `crash_reports`, and the `auth.users` Supabase record.
- Sentry data (if any was captured) must be deleted separately via the Sentry dashboard.

---

## 13. Advertising, Analytics, Tracking

- **None.** No advertising SDKs, no analytics platforms (e.g., Firebase Analytics, Amplitude, Mixpanel), no tracking pixels, no fingerprinting.

---

## 14. External Services Summary

| Service | Purpose | Personal data shared |
|---|---|---|
| Supabase | Auth + database | All user data (primary processor) |
| Open Food Facts | Food lookup | Barcode string or search query only — no personal data |
| Sentry (conditional) | Error tracking | User ID, email, error/crash data |
| Expo / EAS | App updates (OTA) | App binary only |

---

## 15. Unanswered Questions (Require Developer Decision)

| # | Question |
|---|---|
| Q1 | What is the legal entity name or developer name to appear on the privacy policy? (`app.json owner` is "xayder" — is this an individual or a company?) |
| Q2 | What is the privacy contact email? (Placeholder used: `privacy@macrocarry.app`) |
| Q3 | What is the intended age restriction? (COPPA applies if any U.S. users under 13 are anticipated) |
| Q4 | Is `EXPO_PUBLIC_SENTRY_DSN` currently set in production? If yes, Sentry data collection must be prominently disclosed. If no, it can be disclosed as conditional/optional. |
| Q5 | What Supabase region is the project hosted in? (Determines data residency for EU GDPR purposes) |
| Q6 | What is the expected data retention period for food logs and crash reports? |
| Q7 | `NSPhotoLibraryUsageDescription` is declared in `app.json` but the permission is never triggered. Should this be removed from `app.json`? |
| Q8 | Will MacroCarry be available in the EU? If yes, a GDPR section and lawful basis statement are required. |
| Q9 | What custom domain will the legal site use? (Placeholder used: `https://legal.macrocarry.app`) |
