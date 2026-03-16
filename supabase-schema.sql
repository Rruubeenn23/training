-- ============================================================
-- AI Fitness App — Supabase Schema v2
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── USER PROFILES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USER SETTINGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  groq_api_key TEXT,
  units TEXT NOT NULL DEFAULT 'kg',
  language TEXT NOT NULL DEFAULT 'es',
  protein_goal_g INTEGER DEFAULT 170,
  calorie_goal INTEGER DEFAULT 2200,
  water_goal_glasses INTEGER DEFAULT 8,
  rest_timer_duration INTEGER DEFAULT 90,
  post_workout_ai BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AI MEMORY ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profile_facts JSONB NOT NULL DEFAULT '{}',
  training_preferences JSONB NOT NULL DEFAULT '{}',
  performance_notes JSONB NOT NULL DEFAULT '[]',
  observations JSONB NOT NULL DEFAULT '[]',
  goals JSONB NOT NULL DEFAULT '{}',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  memory_version INTEGER NOT NULL DEFAULT 1
);

-- ─── TRAINING PLANS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Mi Plan',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  plan JSONB NOT NULL DEFAULT '{}',
  active_cycle_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRAINING CYCLES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  total_weeks INTEGER NOT NULL,
  phases JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EXERCISE LIBRARY ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT,
  category TEXT,
  instructions TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── WORKOUTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  exercises JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── PERSONAL RECORDS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  best_weight JSONB,
  best_1rm JSONB,
  history JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, exercise_name)
);

-- ─── BODY METRICS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  waist_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── FEELINGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feelings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  energy INTEGER CHECK (energy BETWEEN 1 AND 10),
  sleep INTEGER CHECK (sleep BETWEEN 1 AND 10),
  motivation INTEGER CHECK (motivation BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── NUTRITION ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nutrition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  protein_g NUMERIC(6,1) DEFAULT 0,
  carbs_g NUMERIC(6,1) DEFAULT 0,
  fats_g NUMERIC(6,1) DEFAULT 0,
  water_glasses INTEGER DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── PROGRESS PHOTOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  image_data TEXT,
  angle TEXT,
  notes TEXT,
  weight_kg NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_feelings_user_date ON public.feelings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON public.body_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_records_user ON public.personal_records(user_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_training_plans_user ON public.training_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_user ON public.exercises(user_id, name);
CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON public.ai_memory(user_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users own their data" ON public.profiles;
  DROP POLICY IF EXISTS "Users own their data" ON public.user_settings;
  DROP POLICY IF EXISTS "Users own their data" ON public.ai_memory;
  DROP POLICY IF EXISTS "Users own their data" ON public.training_plans;
  DROP POLICY IF EXISTS "Users own their data" ON public.training_cycles;
  DROP POLICY IF EXISTS "Users own data exercises" ON public.exercises;
  DROP POLICY IF EXISTS "Users own their data" ON public.workouts;
  DROP POLICY IF EXISTS "Users own their data" ON public.personal_records;
  DROP POLICY IF EXISTS "Users own their data" ON public.body_metrics;
  DROP POLICY IF EXISTS "Users own their data" ON public.feelings;
  DROP POLICY IF EXISTS "Users own their data" ON public.nutrition;
  DROP POLICY IF EXISTS "Users own their data" ON public.progress_photos;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Users own their data" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their data" ON public.user_settings FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their data" ON public.ai_memory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.training_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.training_cycles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own data exercises" ON public.exercises FOR ALL USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.personal_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.body_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.feelings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.nutrition FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON public.progress_photos FOR ALL USING (auth.uid() = user_id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── SEED GLOBAL EXERCISES ───────────────────────────────────
INSERT INTO public.exercises (user_id, name, muscle_groups, equipment, category, is_custom) VALUES
(NULL, 'Press banca', ARRAY['pecho','tríceps','hombros'], 'barra', 'compuesto', false),
(NULL, 'Press inclinado mancuernas', ARRAY['pecho','tríceps'], 'mancuernas', 'compuesto', false),
(NULL, 'Press militar', ARRAY['hombros','tríceps'], 'barra', 'compuesto', false),
(NULL, 'Fondos', ARRAY['pecho','tríceps','hombros'], 'peso_corporal', 'compuesto', false),
(NULL, 'Jalón', ARRAY['espalda','bíceps'], 'polea', 'compuesto', false),
(NULL, 'Remo con barra', ARRAY['espalda','bíceps'], 'barra', 'compuesto', false),
(NULL, 'Remo polea baja', ARRAY['espalda','bíceps'], 'polea', 'compuesto', false),
(NULL, 'Dominadas', ARRAY['espalda','bíceps'], 'peso_corporal', 'compuesto', false),
(NULL, 'Sentadilla', ARRAY['cuádriceps','glúteos','isquios'], 'barra', 'compuesto', false),
(NULL, 'Peso muerto', ARRAY['isquios','espalda','glúteos'], 'barra', 'compuesto', false),
(NULL, 'Peso muerto rumano', ARRAY['isquios','glúteos'], 'barra', 'compuesto', false),
(NULL, 'Zancadas', ARRAY['cuádriceps','glúteos'], 'mancuernas', 'compuesto', false),
(NULL, 'Prensa', ARRAY['cuádriceps','glúteos'], 'máquina', 'compuesto', false),
(NULL, 'Curl femoral', ARRAY['isquios'], 'máquina', 'aislamiento', false),
(NULL, 'Extensión cuádriceps', ARRAY['cuádriceps'], 'máquina', 'aislamiento', false),
(NULL, 'Gemelos de pie', ARRAY['gemelos'], 'máquina', 'aislamiento', false),
(NULL, 'Curl EZ', ARRAY['bíceps'], 'barra_ez', 'aislamiento', false),
(NULL, 'Curl con mancuernas', ARRAY['bíceps'], 'mancuernas', 'aislamiento', false),
(NULL, 'Curl martillo', ARRAY['bíceps','braquial'], 'mancuernas', 'aislamiento', false),
(NULL, 'Extensión polea', ARRAY['tríceps'], 'polea', 'aislamiento', false),
(NULL, 'Extensión overhead', ARRAY['tríceps'], 'mancuernas', 'aislamiento', false),
(NULL, 'Elevaciones laterales', ARRAY['hombros'], 'mancuernas', 'aislamiento', false),
(NULL, 'Pájaros', ARRAY['hombros_posterior'], 'mancuernas', 'aislamiento', false),
(NULL, 'Cruces polea', ARRAY['pecho'], 'polea', 'aislamiento', false),
(NULL, 'Pull-over', ARRAY['espalda','pecho'], 'mancuernas', 'aislamiento', false),
(NULL, 'Hip thrust', ARRAY['glúteos','isquios'], 'barra', 'compuesto', false),
(NULL, 'Face pull', ARRAY['hombros_posterior','trapecio'], 'polea', 'aislamiento', false),
(NULL, 'Plancha', ARRAY['core'], 'peso_corporal', 'core', false),
(NULL, 'Abdominales', ARRAY['core'], 'peso_corporal', 'core', false)
ON CONFLICT DO NOTHING;
