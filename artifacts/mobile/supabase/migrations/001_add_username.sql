-- Migration 001: add username to profiles
-- Idempotent — safe to run multiple times.
--
-- STATUS: NOT YET APPLIED — run this in your Supabase SQL Editor.
--
-- After applying this migration:
--   - New registrations store their username immediately via the trigger.
--   - The case-insensitive unique index prevents duplicate usernames.
--   - Existing users retain a NULL username (they can be prompted to set one later).
--
-- NOTE: Until this migration is applied, the email/password flow still works.
-- The app seeds the profile from code when email confirmation is disabled.
-- When email confirmation IS enabled, the trigger is required to preserve the
-- username between signup and the first sign-in.

-- ─── 1. Add nullable username column ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- ─── 2. Case-insensitive unique index (NULL values are excluded) ─────────────
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- ─── 3. Trigger function: auto-create profile on new auth user ───────────────
-- Reads username from user metadata (set during signUp options.data).
-- Sets all numeric goals to 0 so the app's onboarding screen fires and lets
-- the user choose real targets. The app's upsert in onboarding.tsx will fill
-- in the actual values.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    daily_calorie_goal,
    protein_goal_g,
    carbs_goal_g,
    fat_goal_g,
    fiber_goal_g,
    sugar_goal_g,
    sodium_goal_mg,
    carryover_enabled
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    0, 0, 0, 0, 0, 0, 0,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- ─── 4. Attach trigger (drop first for idempotency) ──────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
