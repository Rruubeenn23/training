-- ================================================================
-- FIX: Set onboarding_complete = true for existing users
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ================================================================
-- Why: The backfill in fix-rls-and-triggers.sql created profile rows
-- with onboarding_complete = false for accounts that had no profile row.
-- Previously the app never read the profile (no RLS SELECT policy),
-- so it fell back to localStorage. Now it reads the profile and
-- onboarding_complete = false redirects users back to onboarding.
-- ================================================================

-- Set onboarding_complete = true for all users who have any training data
UPDATE public.profiles
SET onboarding_complete = true
WHERE id IN (
  SELECT DISTINCT user_id FROM public.training_plans
  UNION
  SELECT DISTINCT user_id FROM public.workouts
  UNION
  SELECT DISTINCT user_id FROM public.feelings
  UNION
  SELECT DISTINCT user_id FROM public.nutrition
);

-- Verify: all your accounts should now show onboarding_complete = true
SELECT id, email, onboarding_complete, created_at
FROM public.profiles
ORDER BY created_at DESC;
