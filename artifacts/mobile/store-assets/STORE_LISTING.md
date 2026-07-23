# MacroCarry — Google Play Store Listing

Complete store listing copy and asset inventory for Google Play Console submission.

---

## Short Description (80 chars max)

```
Track calories & macros with carryover. Smart food diary for real results.
```
*(74 characters)*

---

## Full Description (4000 chars max)

```
MacroCarry is a clean, focused macro-nutrient and calorie tracker that helps you stay consistent — not just on good days, but across the whole week.

🔥 CALORIE CARRYOVER
Most apps reset your goal every midnight. MacroCarry carries over your surplus or deficit across days. Eat under on Monday? You earn those calories back on Tuesday. Over on Thursday? Your Friday goal adjusts automatically. Real life doesn't fit perfect daily boxes.

📊 TODAY AT A GLANCE
Open the app to your daily dashboard: a beautiful calorie ring showing exactly how much you've eaten and how much you have left, plus color-coded progress bars for Protein, Carbs, and Fat. Extended macros (fiber, sugar, sodium) are always one tap away.

🍽 MEAL SECTIONS
Log food under Breakfast, Lunch, Dinner, or Snacks. Tap any entry to adjust the portion. Each meal section shows a running calorie subtotal so you can plan ahead.

🔍 FAST FOOD SEARCH
Search over 3 million foods from the Open Food Facts database — completely free, no subscription required. Detailed nutrition panels give you full macro breakdowns before you add anything to your diary.

📷 BARCODE SCANNER
Scan any packaged food's barcode and MacroCarry pulls the nutrition data instantly. Works on supermarket products from over 150 countries. No barcode? Type it in manually.

📅 DIARY & HISTORY
Browse any past date in the Diary tab. Review exactly what you ate and how the day stacked up — useful for spotting patterns and planning repeats of your best days.

📈 WEEKLY OVERVIEW
The Weekly tab shows a 7-day calorie bar chart alongside averages for all four macros compared to your goals. See your whole week at a glance instead of obsessing over a single day.

⚙️ CUSTOMIZABLE GOALS
Set your own daily targets for Calories, Protein, Carbs, and Fat in Settings. Toggle carryover on or off. Everything is yours to adjust.

👥 DIARY SHARING
Share your diary with a coach, trainer, or accountability partner by entering their email. They can read your logs; only you can edit them.

PRIVACY FIRST
MacroCarry uses Google Sign-In via Supabase Auth. Your food data is secured with Row Level Security — only you (and anyone you explicitly share with) can see your logs. We never sell your data.

---

MacroCarry is free to use. No ads. No premium paywall on core features.
```
*(2,227 characters — well within the 4,000 char limit)*

---

## App Category

**Health & Fitness**

## Content Rating

Complete the Google Play content rating questionnaire:
- Violence: None
- Sexual content: None
- Language: None
- Controlled substances: None  
- User-generated content: No (food logs are private per-user, not shared publicly)

→ **Expected rating: Everyone (E)**

---

## Privacy Policy URL

```
https://<your-replit-domain>/api/privacy
```

Replace `<your-replit-domain>` with your published Replit app domain from the deployment settings.
The privacy policy is served at the `/api/privacy` endpoint of the API Server artifact.

---

## Store Graphics Inventory

All assets are in `artifacts/mobile/store-assets/`:

| File | Dimensions | Status | Purpose |
|------|-----------|--------|---------|
| `feature-graphic.png` | 1024×500 | ✅ Ready | Play Store header banner (required) |
| `screenshot-today.png` | 9:16 portrait | ⚠️ MOCKUP — replace | Today tab — calorie ring + macros |
| `screenshot-search.png` | 9:16 portrait | ⚠️ MOCKUP — replace | Food search results |
| `screenshot-scanner.png` | 9:16 portrait | ⚠️ MOCKUP — replace | Barcode scanner |
| `screenshot-weekly.png` | 9:16 portrait | ⚠️ MOCKUP — replace | Weekly bar chart |
| `screenshot-settings.png` | 9:16 portrait | ⚠️ MOCKUP — replace | Goals + settings |

> **⚠️ BLOCKING — DO NOT SUBMIT until screenshots are replaced.**
> The five `screenshot-*.png` files are AI-generated design mockups used as
> placeholders. Google Play requires screenshots captured from the actual running
> app on a real Android device. Submitting AI mockups risks rejection by the Play
> review team for inaccurate representation.

### How to capture real screenshots

1. Install the app on an Android phone via **Expo Go** (scan the QR code from the Replit preview bar) or install the production APK/AAB from an EAS build.
2. Sign in with a test Google account and add some food entries so the screens look populated.
3. Take screenshots on the device:
   - **Today tab** — calorie ring showing progress, macro bars, meal sections
   - **Food Search** — search for "chicken" and show the results list
   - **Barcode Scanner** — open the scanner screen (camera viewfinder)
   - **Weekly tab** — bar chart with at least a few days of data
   - **Settings** — goals and carryover toggle visible
4. Copy the screenshots from your phone and save them to `artifacts/mobile/store-assets/`, replacing the current mockup files. Keep the same filenames.
5. Google Play minimum size: **320px wide**, recommended **1080px wide**, 16:9 or 9:16 ratio.

Google Play requires at least **2 phone screenshots**; aim to upload all 5.  
Recommended upload order: Today → Search → Scanner → Weekly → Settings.

### Screenshot captions (optional, max 80 chars each)

| Screenshot | Caption |
|-----------|---------|
| Today | Hit your goal — with carryover built in |
| Search | 3M+ foods from Open Food Facts |
| Scanner | Scan any barcode in seconds |
| Weekly | See the whole week, not just today |
| Settings | Custom goals, sharing, and more |

---

## Google Play Console — Store Listing Checklist

### Required fields
- [ ] App name: **MacroCarry**
- [ ] Short description: *(see above)*
- [ ] Full description: *(see above)*
- [ ] App icon: upload `artifacts/mobile/assets/images/icon.png` (1024×1024 PNG)
- [ ] Feature graphic: upload `store-assets/feature-graphic.png` (1024×500)
- [ ] **Phone screenshots: REPLACE MOCKUPS with real device captures first** (see "Store Graphics Inventory" above), then upload all 5 (min 2 required)
- [ ] Privacy policy URL: `https://<domain>/api/privacy`

### App content section
- [ ] Privacy policy URL entered
- [ ] Data safety form completed (see below)
- [ ] Content rating questionnaire completed → Expected: **Everyone**
- [ ] Target audience: 13+ (general audience)

### Data safety declaration (Play Console → Policy → App content → Data safety)
| Data type | Collected? | Shared? | Required? | Purpose |
|-----------|-----------|---------|----------|---------|
| Name | Yes | No | Yes | Account management |
| Email address | Yes | No | Yes | Account management |
| User-generated content (food logs) | Yes | No | Yes | App functionality |
| App interactions | No | — | — | — |

Check: "Data is encrypted in transit" ✓  
Check: "Users can request data deletion" ✓

---

## EAS Build — Latest Production Build

| Field | Value |
|-------|-------|
| Build URL | https://expo.dev/accounts/xayder/projects/mobile/builds/405c876c-5b7c-465e-aa62-40db39099841 |
| versionCode | 5 (auto-incremented) |
| Profile | production (AAB, store distribution) |
| Channel | production |
| Triggered | 2026-07-23 |

**To download the AAB once the build finishes (~10–20 min):**
1. Open the build URL above → click **Download** → save the `.aab` file.

---

## How to Upload to Google Play Internal Testing (Manual Steps)

> **Prerequisite**: Screenshots must be real device captures before submitting. See "Store Graphics Inventory" above — mockups are currently in place.

### Step 1 — Create the app in Play Console (first time only)
1. Go to [play.google.com/console](https://play.google.com/console) and sign in.
2. Click **Create app** → App name: `MacroCarry` → Default language: `English (United States)` → App or Game: `App` → Free or Paid: `Free` → Accept policies → **Create app**.
3. Under **App content → Privacy policy**, enter your privacy policy URL (see above).

### Step 2 — Fill in the store listing
1. Go to **Store presence → Main store listing**.
2. App name: `MacroCarry`
3. Short description: paste from "Short Description" section above.
4. Full description: paste from "Full Description" section above.
5. Upload **App icon**: `artifacts/mobile/assets/images/icon.png` (1024×1024).
6. Upload **Feature graphic**: `artifacts/mobile/store-assets/feature-graphic.png` (1024×500).
7. Upload **Phone screenshots** (replace mockups with real captures first): all 5 files in `store-assets/screenshot-*.png`.
8. **Save**.

### Step 3 — Complete App content requirements
1. **Privacy policy** (Policy → App content → Privacy policy): enter your URL.
2. **App access** (App content → App access): choose "All functionality is available without special access" (or add test credentials if sign-in is required).
3. **Ads**: select "This app does not contain ads".
4. **Content rating**: complete the questionnaire — answer None/No to all sensitive categories → expected rating: **Everyone**.
5. **Target audience**: select **13 and above**.
6. **Data safety** (Policy → App content → Data safety): fill in per the "Data safety declaration" table above. Check "Data is encrypted in transit" and "Users can request data deletion".

### Step 4 — Set up Internal Testing track
1. Go to **Testing → Internal testing** → **Create new release**.
2. Under **App bundles**, click **Upload** and select the `.aab` downloaded from EAS.
3. **Release name**: leave as auto-filled (e.g. `1.0.0 (5)`).
4. **Release notes**: add a short note such as `Initial internal test release`.
5. Click **Save** → **Review release** → **Start rollout to Internal testing**.

### Step 5 — Add internal testers
1. Go to **Testing → Internal testing → Testers** tab.
2. Click **Create email list** → name it (e.g. `Core testers`) → add tester email addresses.
3. Copy the **opt-in link** and share it with testers.
4. Testers open the link on their Android device → tap **Become a tester** → install from Play Store.

### Step 6 — Monitor automated review
- Initial review for Internal Testing typically takes **a few hours to 1 business day**.
- Watch for email notifications from Google Play.
- If rejected, the rejection reason appears in Play Console → **Policy status**.

---

## Notes for Submission

1. **App signing**: Use Play App Signing (Google-managed key). The AAB from EAS Build is already signed with the upload key; Google re-signs with their managed key.
2. **EAS build command**: `EAS_NO_VCS=1 eas build --platform android --profile production`
3. **Internal testing track**: Upload the first AAB to Internal Testing before moving to production.
4. **Review time**: Initial review typically takes a few hours to 1 business day for Internal Testing.
