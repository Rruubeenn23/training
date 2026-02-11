/**
 * Database configuration - Supabase (FREE) con AUTO-SYNC
 * 
 * MEJORAS:
 * - Auto-sync en CADA operación (no manual)
 * - Auto-load al iniciar la app
 * - Sincronización en background sin interferir
 */

import { createClient } from '@supabase/supabase-js';

// Configuración - Obtener de settings
let supabaseClient = null;
let autoSyncEnabled = false;

export function initSupabase(url, key) {
  if (!url || !key) return null;
  
  try {
    supabaseClient = createClient(url, key);
    autoSyncEnabled = true;
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

export function setAutoSync(enabled) {
  autoSyncEnabled = enabled;
}

/**
 * Database schema para Supabase
 */
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
 * AUTO-SYNC: Sube un workout individual a Supabase
 * Se llama automáticamente después de guardar localmente
 */
export async function autoSyncWorkout(dateKey, exercises, metadata, userId = 'default-user') {
  if (!supabaseClient || !autoSyncEnabled) return;
  
  try {
    const { error } = await supabaseClient
      .from('workouts')
      .upsert({
        user_id: userId,
        date: dateKey,
        exercises,
        metadata: metadata || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('Error auto-syncing workout:', error);
    } else {
      console.log(`✅ Auto-synced workout for ${dateKey}`);
    }
  } catch (error) {
    console.error('Error in auto-sync:', error);
  }
}

/**
 * AUTO-SYNC: Sube un feeling a Supabase
 */
export async function autoSyncFeeling(dateKey, feeling, userId = 'default-user') {
  if (!supabaseClient || !autoSyncEnabled) return;
  
  try {
    const { error } = await supabaseClient
      .from('feelings')
      .upsert({
        user_id: userId,
        date: dateKey,
        energy: feeling.energy,
        sleep: feeling.sleep,
        motivation: feeling.motivation
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('Error auto-syncing feeling:', error);
    } else {
      console.log(`✅ Auto-synced feeling for ${dateKey}`);
    }
  } catch (error) {
    console.error('Error in auto-sync feeling:', error);
  }
}

/**
 * AUTO-SYNC: Sube nutrition a Supabase
 */
export async function autoSyncNutrition(dateKey, nutrition, userId = 'default-user') {
  if (!supabaseClient || !autoSyncEnabled) return;
  
  try {
    const { error } = await supabaseClient
      .from('nutrition')
      .upsert({
        user_id: userId,
        date: dateKey,
        protein: nutrition.protein || 0,
        carbs: nutrition.carbs || 0,
        fats: nutrition.fats || 0,
        water: nutrition.water || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('Error auto-syncing nutrition:', error);
    } else {
      console.log(`✅ Auto-synced nutrition for ${dateKey}`);
    }
  } catch (error) {
    console.error('Error in auto-sync nutrition:', error);
  }
}

/**
 * AUTO-LOAD: Carga datos desde Supabase al iniciar
 * Se llama automáticamente cuando la app arranca
 */
export async function autoLoadFromSupabase(userId = 'default-user') {
  if (!supabaseClient) return null;

  const data = {
    workoutLogs: {},
    workoutMetadata: {},
    feelings: {},
    nutrition: {}
  };

  try {
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
      console.log(`✅ Auto-loaded ${workouts.length} workouts from Supabase`);
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
      console.log(`✅ Auto-loaded ${feelings.length} feelings from Supabase`);
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
      console.log(`✅ Auto-loaded ${nutrition.length} nutrition logs from Supabase`);
    }

    return data;
  } catch (error) {
    console.error('Error auto-loading from Supabase:', error);
    return null;
  }
}

/**
 * MANUAL SYNC: Sync completo de todos los datos (para botón manual si se desea)
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
 * Load data from Supabase (manual)
 */
export async function loadFromSupabase(userId = 'default-user') {
  return autoLoadFromSupabase(userId);
}