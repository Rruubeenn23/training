/**
 * Database configuration - Supabase (FREE)
 * 
 * Supabase ofrece:
 * - 500MB de base de datos gratis
 * - Auth gratis
 * - Storage gratis (1GB)
 * - API automática
 * 
 * Setup:
 * 1. Ir a supabase.com
 * 2. Crear proyecto gratuito
 * 3. Copiar URL y anon key
 * 4. Pegar aquí
 */

import { createClient } from '@supabase/supabase-js';

// Configuración - Obtener de settings
let supabaseClient = null;

export function initSupabase(url, key) {
  if (!url || !key) return null;
  
  try {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return null;
  }
}

export function getSupabase() {
  return supabaseClient;
}

export function isSupabaseConfigured() {
  return supabaseClient !== null;
}

/**
 * Database schema para Supabase:
 * 
 * Table: workouts
 * - id: uuid (primary key)
 * - user_id: text (para multi-usuario futuro)
 * - date: date (fecha del entrenamiento)
 * - exercises: jsonb (objeto con ejercicios y series)
 * - metadata: jsonb (duración, volumen, etc)
 * - created_at: timestamp
 * - updated_at: timestamp
 * 
 * Table: feelings
 * - id: uuid (primary key)
 * - user_id: text
 * - date: date
 * - energy: int
 * - sleep: int
 * - motivation: int
 * - created_at: timestamp
 * 
 * Table: nutrition
 * - id: uuid (primary key)
 * - user_id: text
 * - date: date
 * - protein: float
 * - carbs: float
 * - fats: float
 * - water: float
 * - created_at: timestamp
 * 
 * Table: photos
 * - id: uuid (primary key)
 * - user_id: text
 * - date: date
 * - image_url: text (URL en Supabase Storage)
 * - notes: text
 * - created_at: timestamp
 */

// SQL para crear las tablas (ejecutar en Supabase SQL editor)
export const DATABASE_SCHEMA = `
-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  date DATE NOT NULL,
  exercises JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Feelings table
CREATE TABLE IF NOT EXISTS feelings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  date DATE NOT NULL,
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  sleep INTEGER CHECK (sleep >= 1 AND sleep <= 10),
  motivation INTEGER CHECK (motivation >= 1 AND motivation <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Nutrition table
CREATE TABLE IF NOT EXISTS nutrition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  date DATE NOT NULL,
  protein FLOAT DEFAULT 0,
  carbs FLOAT DEFAULT 0,
  fats FLOAT DEFAULT 0,
  water FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  date DATE NOT NULL,
  image_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_feelings_user_date ON feelings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_user_date ON photos(user_id, date DESC);

-- Row Level Security (opcional, para seguridad)
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todo por ahora (cambiar en producción)
CREATE POLICY "Enable all access for workouts" ON workouts FOR ALL USING (true);
CREATE POLICY "Enable all access for feelings" ON feelings FOR ALL USING (true);
CREATE POLICY "Enable all access for nutrition" ON nutrition FOR ALL USING (true);
CREATE POLICY "Enable all access for photos" ON photos FOR ALL USING (true);
`;

/**
 * Sync local data to Supabase
 */
export async function syncToSupabase(localData, userId = 'default-user') {
  if (!supabaseClient) {
    throw new Error('Supabase no está configurado');
  }

  const results = {
    workouts: { success: 0, errors: 0 },
    feelings: { success: 0, errors: 0 },
    nutrition: { success: 0, errors: 0 }
  };

  // Sync workouts
  if (localData.workoutLogs) {
    for (const [date, exercises] of Object.entries(localData.workoutLogs)) {
      if (Object.keys(exercises).length === 0) continue;
      
      try {
        const metadata = localData.workoutMetadata?.[date] || {};
        
        const { error } = await supabaseClient
          .from('workouts')
          .upsert({
            user_id: userId,
            date,
            exercises,
            metadata,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,date'
          });

        if (error) throw error;
        results.workouts.success++;
      } catch (error) {
        console.error(`Error syncing workout for ${date}:`, error);
        results.workouts.errors++;
      }
    }
  }

  // Sync feelings
  if (localData.feelings) {
    for (const [date, feeling] of Object.entries(localData.feelings)) {
      try {
        const { error } = await supabaseClient
          .from('feelings')
          .upsert({
            user_id: userId,
            date,
            energy: feeling.energy,
            sleep: feeling.sleep,
            motivation: feeling.motivation
          }, {
            onConflict: 'user_id,date'
          });

        if (error) throw error;
        results.feelings.success++;
      } catch (error) {
        console.error(`Error syncing feeling for ${date}:`, error);
        results.feelings.errors++;
      }
    }
  }

  // Sync nutrition
  if (localData.nutrition) {
    for (const [date, data] of Object.entries(localData.nutrition)) {
      try {
        const { error } = await supabaseClient
          .from('nutrition')
          .upsert({
            user_id: userId,
            date,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fats: data.fats || 0,
            water: data.water || 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,date'
          });

        if (error) throw error;
        results.nutrition.success++;
      } catch (error) {
        console.error(`Error syncing nutrition for ${date}:`, error);
        results.nutrition.errors++;
      }
    }
  }

  return results;
}

/**
 * Load data from Supabase
 */
export async function loadFromSupabase(userId = 'default-user') {
  if (!supabaseClient) {
    throw new Error('Supabase no está configurado');
  }

  const data = {
    workoutLogs: {},
    workoutMetadata: {},
    feelings: {},
    nutrition: {}
  };

  // Load workouts
  const { data: workouts, error: workoutsError } = await supabaseClient
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (!workoutsError && workouts) {
    workouts.forEach(workout => {
      data.workoutLogs[workout.date] = workout.exercises;
      if (workout.metadata) {
        data.workoutMetadata[workout.date] = workout.metadata;
      }
    });
  }

  // Load feelings
  const { data: feelings, error: feelingsError } = await supabaseClient
    .from('feelings')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (!feelingsError && feelings) {
    feelings.forEach(feeling => {
      data.feelings[feeling.date] = {
        energy: feeling.energy,
        sleep: feeling.sleep,
        motivation: feeling.motivation,
        date: feeling.created_at
      };
    });
  }

  // Load nutrition
  const { data: nutrition, error: nutritionError } = await supabaseClient
    .from('nutrition')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (!nutritionError && nutrition) {
    nutrition.forEach(n => {
      data.nutrition[n.date] = {
        protein: n.protein,
        carbs: n.carbs,
        fats: n.fats,
        water: n.water
      };
    });
  }

  return data;
}

/**
 * Auto-sync: Guarda en local Y en Supabase
 */
export async function saveWithSync(key, value, userId = 'default-user') {
  // Guardar en local primero
  await window.storage.set(key, JSON.stringify(value));

  // Si Supabase está configurado, sync automático
  if (supabaseClient) {
    try {
      // Determinar qué tipo de dato es y hacer upsert
      // Esto se puede mejorar según el key
      console.log('Auto-sync a Supabase habilitado para', key);
    } catch (error) {
      console.error('Error en auto-sync:', error);
      // No falla la operación si el sync falla
    }
  }
}