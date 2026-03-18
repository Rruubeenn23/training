-- ================================================================
-- FIX: Add missing UNIQUE constraints for upsert operations
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ================================================================
-- These constraints are required for INSERT ... ON CONFLICT to work.
-- Without them every upsert throws an error and data is never saved.
-- ================================================================

-- Step 1: Deduplicate existing rows (safe — keeps the most recent)
-- (Failed upserts may have inserted duplicate rows as plain INSERTs)

-- Workouts
DELETE FROM public.workouts
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM public.workouts
  ORDER BY user_id, date, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Feelings
DELETE FROM public.feelings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM public.feelings
  ORDER BY user_id, date, created_at DESC NULLS LAST
);

-- Nutrition
DELETE FROM public.nutrition
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM public.nutrition
  ORDER BY user_id, date, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Body metrics
DELETE FROM public.body_metrics
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date) id
  FROM public.body_metrics
  ORDER BY user_id, date, created_at DESC NULLS LAST
);

-- Personal records
DELETE FROM public.personal_records
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, exercise_name) id
  FROM public.personal_records
  ORDER BY user_id, exercise_name, updated_at DESC NULLS LAST
);

-- ----------------------------------------------------------------
-- Step 2: Add the missing UNIQUE constraints
-- ----------------------------------------------------------------

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_user_id_date_key UNIQUE (user_id, date);

ALTER TABLE public.feelings
  ADD CONSTRAINT feelings_user_id_date_key UNIQUE (user_id, date);

ALTER TABLE public.nutrition
  ADD CONSTRAINT nutrition_user_id_date_key UNIQUE (user_id, date);

ALTER TABLE public.body_metrics
  ADD CONSTRAINT body_metrics_user_id_date_key UNIQUE (user_id, date);

ALTER TABLE public.personal_records
  ADD CONSTRAINT personal_records_user_id_exercise_name_key UNIQUE (user_id, exercise_name);

-- ----------------------------------------------------------------
-- Step 3: Verify (should return 5 rows, one per constraint)
-- ----------------------------------------------------------------
SELECT conrelid::regclass AS table_name, conname AS constraint_name
FROM pg_constraint
WHERE contype = 'u'
  AND conrelid::regclass::text IN (
    'workouts','feelings','nutrition','body_metrics','personal_records'
  )
ORDER BY table_name;
