-- ================================================================
-- FIX: Add UNIQUE constraint on training_plans(user_id)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ================================================================
-- This makes upsertTrainingPlan atomic (no SELECT + INSERT/UPDATE race).
-- Same pattern as workouts(user_id, date) already added earlier.
-- ================================================================

-- Step 1: Keep only one plan per user (the most recently updated active plan)
DELETE FROM public.training_plans
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.training_plans
  ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 2: Add UNIQUE constraint
ALTER TABLE public.training_plans
  ADD CONSTRAINT training_plans_user_id_key UNIQUE (user_id);

-- Step 3: Verify
SELECT user_id, name, is_active, created_at, updated_at
FROM public.training_plans
ORDER BY created_at DESC;
