# MacroCarry

A production-ready food tracking app for Android (and iOS) built with Expo React Native, Supabase, and Open Food Facts.

---

## Features

- **Google OAuth login** via Supabase Auth
- **Barcode scanning** with the device camera (Open Food Facts API)
- **Manual food entry** with reusable food database
- **Calorie & macro tracking** — calories, protein, carbs, fat, fiber, sugar, sodium
- **Carryover calories** — unused/over-eaten calories carry to the next day
- **Weekly summary** — 7-day average calories and macros
- **Food diary** — view any past day's log
- **Copy from previous day** — select individual foods to copy
- **Sharing** — share your food log by email (read-only)

---

## Environment Variables

Set these in your Replit Secrets (or `.env.local`):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Supabase Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the SQL migrations

In your Supabase SQL editor, run the following:

```sql
-- Profiles table
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  display_name text,
  daily_calorie_goal int not null default 2000,
  protein_goal_g int not null default 150,
  carbs_goal_g int not null default 225,
  fat_goal_g int not null default 65,
  fiber_goal_g int not null default 25,
  sugar_goal_g int not null default 50,
  sodium_goal_mg int not null default 2300,
  carryover_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Food logs
create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_name text not null,
  brand text,
  barcode text,
  serving_amount numeric not null default 1,
  serving_unit text not null default 'g',
  grams numeric,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  sugar_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  source text not null default 'manual' check (source in ('open_food_facts', 'manual', 'copied')),
  created_at timestamptz not null default now()
);

create index on food_logs (user_id, date);

-- Manual foods
create table manual_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  food_name text not null,
  brand text,
  barcode text,
  serving_size numeric not null default 100,
  serving_unit text not null default 'g',
  calories_per_serving numeric not null default 0,
  protein_g_per_serving numeric not null default 0,
  carbs_g_per_serving numeric not null default 0,
  fat_g_per_serving numeric not null default 0,
  fiber_g_per_serving numeric not null default 0,
  sugar_g_per_serving numeric not null default 0,
  sodium_mg_per_serving numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Share permissions
create table share_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  shared_with_email text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, shared_with_email)
);

-- Row Level Security
alter table profiles enable row level security;
alter table food_logs enable row level security;
alter table manual_foods enable row level security;
alter table share_permissions enable row level security;

-- Profiles: users manage their own
create policy "Users can manage their own profile"
  on profiles for all
  using (auth.uid() = id);

-- Food logs: users manage their own
create policy "Users can manage their own food logs"
  on food_logs for all
  using (auth.uid() = user_id);

-- Food logs: shared viewers can read
create policy "Shared viewers can read food logs"
  on food_logs for select
  using (
    exists (
      select 1 from share_permissions
      where owner_id = food_logs.user_id
        and shared_with_email = (auth.jwt() ->> 'email')
    )
  );

-- Manual foods: users manage their own
create policy "Users can manage their own manual foods"
  on manual_foods for all
  using (auth.uid() = user_id);

-- Share permissions: owners manage their own, viewers can read theirs
create policy "Owners can manage their share permissions"
  on share_permissions for all
  using (auth.uid() = owner_id);

create policy "Shared viewers can see their shares"
  on share_permissions for select
  using (shared_with_email = (auth.jwt() ->> 'email'));
```

### 3. Enable Google OAuth

This requires steps in **both** Google Cloud Console and Supabase. Do them in order.

---

#### A. Get the callback URL from Supabase first

1. Go to your Supabase dashboard → **Authentication → Providers → Google**
2. Toggle **Google enabled** ON
3. You'll see a **Callback URL (for OAuth)** on that page — it looks like:
   `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
4. **Copy that URL** — you'll need it in step B. Don't save in Supabase yet.

---

#### B. Set up a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project** → give it a name → **Create**
3. Make sure your new project is selected in the top dropdown

---

#### C. Configure the OAuth consent screen

This must be done before you can create credentials.

1. In the left sidebar, go to **APIs & Services → OAuth consent screen**
2. Choose **External** → click **Create**
3. Fill in the required fields:
   - **App name**: MacroCarry (or whatever you like)
   - **User support email**: your email address
   - **Developer contact information**: your email address
4. Click **Save and Continue** through the rest of the screens (Scopes, Test users) — defaults are fine
5. On the **Summary** page click **Back to Dashboard**
6. Click **Publish App** → **Confirm** (this moves it from Testing to Production so any Google account can log in, not just test users you manually add)

---

#### D. Create OAuth credentials

1. In the left sidebar go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. For **Application type** choose **Web application**
4. Give it a name (e.g. "MacroCarry")
5. Under **Authorized redirect URIs** click **+ Add URI** and paste the Supabase callback URL you copied in step A:
   `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
6. Click **Create**
7. A dialog shows your **Client ID** and **Client Secret** — copy both

---

#### E. Finish in Supabase

1. Back in Supabase → **Authentication → Providers → Google**
2. Paste the **Client ID** and **Client Secret** from step D
3. Click **Save**

---

#### F. Add the mobile redirect URL

1. In Supabase → **Authentication → URL Configuration**
2. Under **Redirect URLs** click **Add URL**
3. Add exactly: `mobile://`
4. Click **Save**

---

> **Common mistakes:**
> - Skipping "Publish App" on the consent screen — only manually-added test users can log in until you publish
> - Using the wrong application type (must be **Web application**, not iOS/Android)
> - Forgetting to add `mobile://` to Supabase redirect URLs (the app will hang after Google sign-in)

---

## Running in Replit

1. Set your environment variables in Replit Secrets
2. The `expo` workflow starts automatically — scan the QR code with Expo Go on your phone
3. Or view the web preview in the Replit preview pane

---

## Testing Barcode Scanning

1. Open the app on a physical device via Expo Go
2. Tap **+** on any meal section → **Scan barcode**
3. Point the camera at any food product barcode (EAN-13, UPC-A, etc.)
4. The app looks up the product on Open Food Facts
5. If not found, you can enter the barcode manually or use manual entry

**Test barcodes:**
- `5449000000996` — Coca-Cola Classic 330ml
- `8000500037560` — Nutella 400g
- `3017620422003` — Nutella (FR)
- `0016000275607` — Cheerios

---

## Testing Carryover

1. Log in and set a calorie goal (e.g. 2000 kcal)
2. On Day 1, log only 1500 kcal of food
3. On Day 2, your dashboard will show: Goal = 2000 + 500 carryover = 2500 adjusted goal
4. Toggle carryover on/off in Settings

---

## Building for Android (Google Play)

MacroCarry uses Expo. To build an APK/AAB for Android:

### Option A: EAS Build (recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Configure EAS
eas build:configure

# Build APK (for sideloading/testing)
eas build --platform android --profile preview

# Build AAB (for Google Play submission)
eas build --platform android --profile production
```

### Option B: Local build

```bash
# Generate Android project
npx expo prebuild --platform android

# Build with Gradle
cd android && ./gradlew assembleRelease
```

### eas.json example

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### Google Play submission

1. Create a Google Play Developer account ($25 one-time fee)
2. Create a new app in the Play Console
3. Upload the AAB from EAS build
4. Fill in store listing (description, screenshots, privacy policy)
5. Submit for review

---

## Architecture

- **Auth**: Supabase Auth with Google OAuth → `expo-web-browser` redirect flow
- **Database**: Supabase PostgreSQL with Row Level Security
- **API**: Open Food Facts (free, no key required)
- **State**: React Query for server state, React Context for auth
- **Navigation**: Expo Router (file-based routing)
- **Styling**: React Native StyleSheet with dynamic theming

## Project Structure

```
artifacts/mobile/
├── app/
│   ├── _layout.tsx           # Root layout (providers)
│   ├── index.tsx             # Auth redirect
│   ├── (auth)/               # Login + onboarding
│   ├── (tabs)/               # Main 4-tab app
│   ├── add-food.tsx          # Add food menu
│   ├── scanner.tsx           # Barcode scanner
│   ├── serving-picker.tsx    # Choose serving size
│   ├── food-search.tsx       # Search foods
│   ├── manual-food.tsx       # Manual entry
│   ├── copy-day.tsx          # Copy from past day
│   ├── sharing.tsx           # Share settings
│   └── shared-with-me.tsx    # View shared logs
├── components/               # Reusable UI components
├── context/                  # AuthContext
├── lib/                      # supabase, openFoodFacts, utils
├── types/                    # TypeScript interfaces
└── constants/colors.ts       # Design tokens
```
