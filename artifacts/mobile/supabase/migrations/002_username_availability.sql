-- Migration 002: is_username_available RPC function
-- Idempotent — safe to run multiple times.
--
-- STATUS: NOT YET APPLIED — run this in your Supabase SQL Editor.
--
-- Purpose: provide a narrowly-scoped boolean check that the app calls before
-- auth.signUp. The function is SECURITY DEFINER so it can read profiles without
-- exposing profile rows to the anon role. It returns only true/false.
--
-- Do NOT modify or rerun migration 001.

-- ─── Drop and recreate (idempotent) ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.is_username_available(text);

CREATE FUNCTION public.is_username_available(candidate text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  trimmed text;
BEGIN
  trimmed := trim(candidate);

  -- Enforce format: 3–24 chars, letters/numbers/underscores only
  IF char_length(trimmed) < 3 OR char_length(trimmed) > 24 THEN
    RETURN false;
  END IF;
  IF NOT (trimmed ~ '^[a-zA-Z0-9_]+$') THEN
    RETURN false;
  END IF;

  -- Case-insensitive existence check — returns false if taken
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(trimmed)
  );
END;
$$;

-- ─── Permissions ─────────────────────────────────────────────────────────────
-- Revoke default PUBLIC execute, then grant only to roles that need it
REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_username_available(text) TO anon;
GRANT  EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated;
