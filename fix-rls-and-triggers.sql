-- ================================================================
-- FIX: Add RLS policies + auto-user trigger
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ================================================================
-- Root cause: RLS is enabled by default on all Supabase tables.
-- Without SELECT policies, every query returns 0 rows (no error).
-- Without INSERT policies, every upsert throws a 403 (caught silently).
-- Result: data saves look OK, but on reload everything comes back empty.
-- ================================================================

-- ----------------------------------------------------------------
-- Step 1: Enable RLS (idempotent — safe to run if already enabled)
-- ----------------------------------------------------------------

ALTER TABLE public.workouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feelings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_cycles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos           ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Step 2: Drop existing policies (to avoid conflicts on re-run)
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "workouts_user_policy"          ON public.workouts;
DROP POLICY IF EXISTS "feelings_user_policy"          ON public.feelings;
DROP POLICY IF EXISTS "nutrition_user_policy"         ON public.nutrition;
DROP POLICY IF EXISTS "body_metrics_user_policy"      ON public.body_metrics;
DROP POLICY IF EXISTS "personal_records_user_policy"  ON public.personal_records;
DROP POLICY IF EXISTS "profiles_user_policy"          ON public.profiles;
DROP POLICY IF EXISTS "user_settings_user_policy"     ON public.user_settings;
DROP POLICY IF EXISTS "ai_memory_user_policy"         ON public.ai_memory;
DROP POLICY IF EXISTS "training_plans_user_policy"    ON public.training_plans;
DROP POLICY IF EXISTS "training_cycles_user_policy"   ON public.training_cycles;
DROP POLICY IF EXISTS "exercises_select_policy"       ON public.exercises;
DROP POLICY IF EXISTS "exercises_write_policy"        ON public.exercises;
DROP POLICY IF EXISTS "progress_photos_user_policy"   ON public.progress_photos;
DROP POLICY IF EXISTS "photos_user_policy"            ON public.photos;

-- ----------------------------------------------------------------
-- Step 3: Create policies — each user can only see/edit their own rows
-- ----------------------------------------------------------------

-- workouts
CREATE POLICY "workouts_user_policy" ON public.workouts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- feelings
CREATE POLICY "feelings_user_policy" ON public.feelings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- nutrition
CREATE POLICY "nutrition_user_policy" ON public.nutrition
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- body_metrics
CREATE POLICY "body_metrics_user_policy" ON public.body_metrics
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- personal_records
CREATE POLICY "personal_records_user_policy" ON public.personal_records
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles (the PK is id, not user_id)
CREATE POLICY "profiles_user_policy" ON public.profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- user_settings (the PK is id, not user_id)
CREATE POLICY "user_settings_user_policy" ON public.user_settings
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ai_memory
CREATE POLICY "ai_memory_user_policy" ON public.ai_memory
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- training_plans
CREATE POLICY "training_plans_user_policy" ON public.training_plans
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- training_cycles
CREATE POLICY "training_cycles_user_policy" ON public.training_cycles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- exercises: global exercises (user_id IS NULL) are readable by all logged-in users;
--            custom exercises are owned by their creator
CREATE POLICY "exercises_select_policy" ON public.exercises
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "exercises_write_policy" ON public.exercises
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- progress_photos
CREATE POLICY "progress_photos_user_policy" ON public.progress_photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- photos
CREATE POLICY "photos_user_policy" ON public.photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Step 4: Auto-create profile + settings rows when a user signs up
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile row
  INSERT INTO public.profiles (id, email, display_name, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user_settings row with defaults
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------
-- Step 5: Back-fill missing rows for users who signed up BEFORE
--         the trigger was added (one-time, safe to re-run)
-- ----------------------------------------------------------------

INSERT INTO public.profiles (id, email, display_name, onboarding_complete)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  false
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_settings (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Step 6: Verify — should show policies for all tables
-- ----------------------------------------------------------------

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
