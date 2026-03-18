-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  training_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  performance_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  memory_version integer NOT NULL DEFAULT 1,
  CONSTRAINT ai_memory_pkey PRIMARY KEY (id),
  CONSTRAINT ai_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.body_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  weight_kg numeric,
  body_fat_pct numeric,
  waist_cm numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT body_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT body_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  muscle_groups ARRAY DEFAULT '{}'::text[],
  equipment text,
  category text,
  instructions text,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exercises_pkey PRIMARY KEY (id),
  CONSTRAINT exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.feelings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  energy integer CHECK (energy >= 1 AND energy <= 10),
  sleep integer CHECK (sleep >= 1 AND sleep <= 10),
  motivation integer CHECK (motivation >= 1 AND motivation <= 10),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feelings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.nutrition (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  protein double precision DEFAULT 0,
  carbs double precision DEFAULT 0,
  fats double precision DEFAULT 0,
  water double precision DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nutrition_pkey PRIMARY KEY (id)
);
CREATE TABLE public.personal_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  best_weight jsonb,
  best_1rm jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT personal_records_pkey PRIMARY KEY (id),
  CONSTRAINT personal_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  image_url text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT photos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  email text,
  avatar_url text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.progress_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  image_data text,
  angle text,
  notes text,
  weight_kg numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT progress_photos_pkey PRIMARY KEY (id),
  CONSTRAINT progress_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.training_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  total_weeks integer NOT NULL,
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT training_cycles_pkey PRIMARY KEY (id),
  CONSTRAINT training_cycles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.training_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Mi Plan'::text,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_cycle_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT training_plans_pkey PRIMARY KEY (id),
  CONSTRAINT training_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_settings (
  id uuid NOT NULL,
  groq_api_key text,
  units text NOT NULL DEFAULT 'kg'::text,
  language text NOT NULL DEFAULT 'es'::text,
  protein_goal_g integer DEFAULT 170,
  calorie_goal integer DEFAULT 2200,
  water_goal_glasses integer DEFAULT 8,
  rest_timer_duration integer DEFAULT 90,
  post_workout_ai boolean DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  exercises jsonb NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workouts_pkey PRIMARY KEY (id)
);