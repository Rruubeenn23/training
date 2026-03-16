/**
 * Helper functions para manejo de storage con AUTO-SYNC a Supabase
 */

import { autoSyncWorkout, autoSyncFeeling, autoSyncNutrition } from './database';

const STORAGE_KEYS = {
  WORKOUT_LOGS: 'workout-logs',
  FEELINGS: 'daily-feelings',
  NUTRITION: 'nutrition-logs',
  PHOTOS: 'progress-photos',
  SETTINGS: 'app-settings',
  WORKOUT_METADATA: 'workout-metadata',
  TRAINING_PLAN: 'training-plan',
  TRAINING_CYCLES: 'training-cycles',
  PROGRESSION_TARGETS: 'progression-targets',
  PERSONAL_RECORDS: 'personal-records',
  BODY_METRICS: 'body-metrics',
  OFFLINE_SYNC_QUEUE: 'offline-sync-queue',
  WORKOUT_STREAK: 'workout-streak',
};

/**
 * Get workout logs
 */
export async function getWorkoutLogs() {
  try {
    const logs = await window.storage.get(STORAGE_KEYS.WORKOUT_LOGS);
    return logs?.value ? JSON.parse(logs.value) : {};
  } catch (error) {
    console.error('Error getting workout logs:', error);
    return {};
  }
}

/**
 * Save workout logs - CON AUTO-SYNC
 */
export async function saveWorkoutLogs(logs) {
  try {
    // Guardar localmente
    await window.storage.set(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs));
    
    // Auto-sync: Sincronizar CADA workout modificado a Supabase
    // Esto asegura que cualquier cambio se suba automáticamente
    const metadata = await getWorkoutMetadata();
    for (const [dateKey, exercises] of Object.entries(logs)) {
      if (Object.keys(exercises).length > 0) {
        // Sync en background sin esperar
        autoSyncWorkout(dateKey, exercises, metadata[dateKey]);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving workout logs:', error);
    return false;
  }
}

/**
 * Save single workout for a specific date - CON AUTO-SYNC
 */
export async function saveWorkoutForDate(dateKey, exercises, metadata = null) {
  try {
    // Obtener logs existentes
    const allLogs = await getWorkoutLogs();
    
    // Actualizar el día específico
    allLogs[dateKey] = exercises;
    
    // Guardar localmente
    await window.storage.set(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(allLogs));
    
    // Guardar metadata si se proporciona
    if (metadata) {
      await saveWorkoutMetadata(dateKey, metadata);
    }
    
    // Auto-sync INMEDIATO para este workout
    await autoSyncWorkout(dateKey, exercises, metadata);
    
    return true;
  } catch (error) {
    console.error('Error saving workout for date:', error);
    return false;
  }
}

/**
 * Get workout metadata (duration, volume, etc)
 */
export async function getWorkoutMetadata() {
  try {
    const metadata = await window.storage.get(STORAGE_KEYS.WORKOUT_METADATA);
    return metadata?.value ? JSON.parse(metadata.value) : {};
  } catch (error) {
    console.error('Error getting workout metadata:', error);
    return {};
  }
}

/**
 * Save workout metadata - CON AUTO-SYNC
 */
export async function saveWorkoutMetadata(dateKey, metadata) {
  try {
    const allMetadata = await getWorkoutMetadata();
    allMetadata[dateKey] = metadata;
    await window.storage.set(STORAGE_KEYS.WORKOUT_METADATA, JSON.stringify(allMetadata));
    
    // El metadata se sube junto con el workout en autoSyncWorkout
    
    return true;
  } catch (error) {
    console.error('Error saving workout metadata:', error);
    return false;
  }
}

/**
 * Get daily feelings
 */
export async function getDailyFeelings() {
  try {
    const feelings = await window.storage.get(STORAGE_KEYS.FEELINGS);
    return feelings?.value ? JSON.parse(feelings.value) : {};
  } catch (error) {
    console.error('Error getting feelings:', error);
    return {};
  }
}

/**
 * Save daily feeling - CON AUTO-SYNC
 */
export async function saveDailyFeeling(dateKey, feeling) {
  try {
    const allFeelings = await getDailyFeelings();
    allFeelings[dateKey] = feeling;
    
    // Guardar localmente
    await window.storage.set(STORAGE_KEYS.FEELINGS, JSON.stringify(allFeelings));
    
    // Auto-sync INMEDIATO
    await autoSyncFeeling(dateKey, feeling);
    
    return true;
  } catch (error) {
    console.error('Error saving feeling:', error);
    return false;
  }
}

/**
 * Get nutrition logs
 */
export async function getNutritionLogs() {
  try {
    const nutrition = await window.storage.get(STORAGE_KEYS.NUTRITION);
    return nutrition?.value ? JSON.parse(nutrition.value) : {};
  } catch (error) {
    console.error('Error getting nutrition logs:', error);
    return {};
  }
}

/**
 * Save nutrition log - CON AUTO-SYNC
 */
export async function saveNutritionLog(dateKey, nutritionData) {
  try {
    const allNutrition = await getNutritionLogs();
    allNutrition[dateKey] = nutritionData;
    
    // Guardar localmente
    await window.storage.set(STORAGE_KEYS.NUTRITION, JSON.stringify(allNutrition));
    
    // Auto-sync INMEDIATO
    await autoSyncNutrition(dateKey, nutritionData);
    
    return true;
  } catch (error) {
    console.error('Error saving nutrition:', error);
    return false;
  }
}

/**
 * Get progress photos
 */
export async function getProgressPhotos() {
  try {
    const photos = await window.storage.get(STORAGE_KEYS.PHOTOS);
    return photos?.value ? JSON.parse(photos.value) : [];
  } catch (error) {
    console.error('Error getting photos:', error);
    return [];
  }
}

/**
 * Save progress photo
 */
export async function saveProgressPhoto(photoData) {
  try {
    const allPhotos = await getProgressPhotos();
    allPhotos.push(photoData);
    await window.storage.set(STORAGE_KEYS.PHOTOS, JSON.stringify(allPhotos));
    
    // TODO: Implementar sync de fotos a Supabase Storage si se desea
    
    return true;
  } catch (error) {
    console.error('Error saving photo:', error);
    return false;
  }
}

/**
 * Delete progress photo
 */
export async function deleteProgressPhoto(photoId) {
  try {
    const allPhotos = await getProgressPhotos();
    const updatedPhotos = allPhotos.filter(p => p.id !== photoId);
    await window.storage.set(STORAGE_KEYS.PHOTOS, JSON.stringify(updatedPhotos));
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
}

/**
 * Get app settings
 */
export async function getSettings() {
  try {
    const settings = await window.storage.get(STORAGE_KEYS.SETTINGS);
    return settings?.value ? JSON.parse(settings.value) : getDefaultSettings();
  } catch (error) {
    console.error('Error getting settings:', error);
    return getDefaultSettings();
  }
}

/**
 * Save app settings
 */
export async function saveSettings(settings) {
  try {
    await window.storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

function getDefaultSettings() {
  return {
    theme: 'dark',
    notifications: true,
    apiKey: '',
    proteinGoal: 170,
    calorieGoal: 2200,
    supabaseUrl: '',
    supabaseKey: ''
  };
}

/**
 * Merge datos de Supabase con datos locales
 * Se usa al iniciar la app
 */
export async function mergeSupabaseData(supabaseData) {
  try {
    if (!supabaseData) return false;
    
    // Merge workouts
    if (supabaseData.workoutLogs && Object.keys(supabaseData.workoutLogs).length > 0) {
      const localLogs = await getWorkoutLogs();
      const merged = { ...localLogs, ...supabaseData.workoutLogs };
      await window.storage.set(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(merged));
    }
    
    // Merge metadata
    if (supabaseData.workoutMetadata && Object.keys(supabaseData.workoutMetadata).length > 0) {
      const localMeta = await getWorkoutMetadata();
      const merged = { ...localMeta, ...supabaseData.workoutMetadata };
      await window.storage.set(STORAGE_KEYS.WORKOUT_METADATA, JSON.stringify(merged));
    }
    
    // Merge feelings
    if (supabaseData.feelings && Object.keys(supabaseData.feelings).length > 0) {
      const localFeelings = await getDailyFeelings();
      const merged = { ...localFeelings, ...supabaseData.feelings };
      await window.storage.set(STORAGE_KEYS.FEELINGS, JSON.stringify(merged));
    }
    
    // Merge nutrition
    if (supabaseData.nutrition && Object.keys(supabaseData.nutrition).length > 0) {
      const localNutrition = await getNutritionLogs();
      const merged = { ...localNutrition, ...supabaseData.nutrition };
      await window.storage.set(STORAGE_KEYS.NUTRITION, JSON.stringify(merged));
    }
    
    return true;
  } catch (error) {
    console.error('Error merging Supabase data:', error);
    return false;
  }
}

/**
 * Get exercise history for charts
 */
export function getExerciseHistory(workoutLogs, exerciseName) {
  const history = [];
  
  Object.entries(workoutLogs).forEach(([date, exercises]) => {
    if (exercises[exerciseName]) {
      const sets = exercises[exerciseName];
      const weights = Object.values(sets)
        .filter(set => set.weight && set.reps)
        .map(set => ({
          weight: parseFloat(set.weight),
          reps: set.reps,
          date
        }));
      
      if (weights.length > 0) {
        history.push({
          date,
          ...calculateBestSet(weights)
        });
      }
    }
  });
  
  return history.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateBestSet(sets) {
  // Calcula el mejor set (mayor peso x reps)
  let best = sets[0];
  let maxScore = best.weight * best.reps;
  
  sets.forEach(set => {
    const score = set.weight * set.reps;
    if (score > maxScore) {
      maxScore = score;
      best = set;
    }
  });
  
  return {
    maxWeight: best.weight,
    repsAtMax: best.reps,
    volume: maxScore,
    estimated1RM: calculate1RM(best.weight, best.reps)
  };
}

function calculate1RM(weight, reps) {
  // Fórmula de Epley
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Get all unique exercises
 */
export function getAllExercises(workoutLogs) {
  const exercises = new Set();
  
  Object.values(workoutLogs).forEach(dayLog => {
    Object.keys(dayLog).forEach(exercise => {
      exercises.add(exercise);
    });
  });
  
  return Array.from(exercises).sort();
}

/**
 * Export all data
 */
export async function exportAllData() {
  const data = {
    workoutLogs: await getWorkoutLogs(),
    workoutMetadata: await getWorkoutMetadata(),
    feelings: await getDailyFeelings(),
    nutrition: await getNutritionLogs(),
    photos: await getProgressPhotos(),
    settings: await getSettings(),
    exportDate: new Date().toISOString()
  };
  
  return data;
}

// ─── Training Plan ────────────────────────────────────────────────────────────

export function getDefaultTrainingPlan() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    activeCycleId: null,
    plan: {
      lunes: {
        name: 'Empuje Fuerte', emoji: '🔵',
        muscle: 'Pecho + Hombro + Tríceps', intensity: 'Alta',
        exercises: [
          { name: 'Press banca',                weight: '55/60/65 kg',   reps: '8/6-8/5-6' },
          { name: 'Press inclinado mancuernas', weight: '17.5 kg',       reps: '3×8-10' },
          { name: 'Cruces polea',              weight: '10-12 kg',       reps: '2×12-15' },
          { name: 'Press militar',             weight: '45 kg',          reps: '3×6-8' },
          { name: 'Fondos',                    weight: 'PC + 2.5-5 kg',  reps: '3×6-10' },
          { name: 'Extensión polea',           weight: '32-35 kg',       reps: '2×10-12' },
          { name: 'Extensión overhead',        weight: '22-25 kg',       reps: '2×12-15' },
        ],
      },
      martes: {
        name: 'Tracción', emoji: '🟢',
        muscle: 'Espalda + Bíceps', intensity: 'Medio-Alto',
        exercises: [
          { name: 'Jalón',                      weight: '75/80/80 kg', reps: '10/8-10/6-8' },
          { name: 'Remo multipower',            weight: '50 kg',       reps: '3×8-10' },
          { name: 'Remo polea',                 weight: '60 kg',       reps: '2×10-12' },
          { name: 'Remo unilateral polea',      weight: 'Medio-alto',  reps: '2×10-12' },
          { name: 'Pull-over',                  weight: '35 kg',       reps: '2×12-15' },
          { name: 'Curl EZ',                    weight: '30 kg',       reps: '3×8-8-6' },
          { name: 'Curl polea/martillo',        weight: 'Medio',       reps: '2×10-12' },
          { name: 'Curl polea baja',            weight: '25 kg',       reps: '2×12-15' },
        ],
      },
      miercoles: {
        name: 'Pierna Completa', emoji: '🟡',
        muscle: 'Cuádriceps + Femoral + Gemelos', intensity: 'Media',
        exercises: [
          { name: 'Sentadilla',                   weight: '70/80/82.5 kg', reps: '8/6-8/6' },
          { name: 'Zancadas',                     weight: '17.5 kg',       reps: '2×10-12' },
          { name: 'Sentadilla pies adelantados',  weight: 'Medio',         reps: '2×10-12' },
          { name: 'Peso muerto rumano',           weight: '60-70 kg',      reps: '3×8-10' },
          { name: 'Curl femoral',                 weight: 'Medio',         reps: '2×12-15' },
          { name: 'Gemelos',                      weight: 'Medio-alto',    reps: '3×15-20' },
        ],
      },
      jueves: {
        name: 'Bomba / Recuperación', emoji: '🟣',
        muscle: 'Volumen ligero', intensity: 'Media-Baja',
        exercises: [
          { name: 'Elevaciones laterales',      reps: '3×12-15' },
          { name: 'Pájaros',                    reps: '3×12-15' },
          { name: 'Press militar ligero',       reps: '2×8-10' },
          { name: 'Press inclinado multipower', reps: '2×8-10' },
          { name: 'Aperturas inclinadas',       reps: '2×12-15' },
          { name: 'Curl polea',                 reps: '2×12-15' },
          { name: 'Extensión polea',            reps: '2×12-15' },
          { name: 'Fondos banco',               reps: '2×12-15' },
        ],
      },
      viernes:  { name: 'Fútbol',          emoji: '🔴', muscle: 'HIIT Natural',           intensity: 'Alta',      exercises: [] },
      sabado:   { name: 'Descanso',         emoji: '🟤', muscle: 'Recuperación activa',    intensity: 'Baja',      exercises: [] },
      domingo:  { name: 'Pádel (Opcional)', emoji: '⚪', muscle: 'Aeróbico intermitente',  intensity: 'Media',     exercises: [] },
    }
  };
}

export async function getTrainingPlan() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.TRAINING_PLAN);
    return data?.value ? JSON.parse(data.value) : null;
  } catch {
    return null;
  }
}

export async function saveTrainingPlan(plan) {
  try {
    const updated = { ...plan, updatedAt: new Date().toISOString() };
    await window.storage.set(STORAGE_KEYS.TRAINING_PLAN, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

// ─── Training Cycles ──────────────────────────────────────────────────────────

export async function getTrainingCycles() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.TRAINING_CYCLES);
    return data?.value ? JSON.parse(data.value) : { cycles: [], activeCycleId: null };
  } catch {
    return { cycles: [], activeCycleId: null };
  }
}

export async function saveTrainingCycles(cycles) {
  try {
    await window.storage.set(STORAGE_KEYS.TRAINING_CYCLES, JSON.stringify(cycles));
    return true;
  } catch {
    return false;
  }
}

// ─── Progression Targets ──────────────────────────────────────────────────────

export async function getProgressionTargets() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.PROGRESSION_TARGETS);
    return data?.value ? JSON.parse(data.value) : {};
  } catch {
    return {};
  }
}

export async function saveProgressionTargets(targets) {
  try {
    await window.storage.set(STORAGE_KEYS.PROGRESSION_TARGETS, JSON.stringify(targets));
    return true;
  } catch {
    return false;
  }
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export async function getPersonalRecords() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.PERSONAL_RECORDS);
    return data?.value ? JSON.parse(data.value) : {};
  } catch {
    return {};
  }
}

export async function savePersonalRecords(records) {
  try {
    await window.storage.set(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

export async function getBodyMetrics() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.BODY_METRICS);
    return data?.value ? JSON.parse(data.value) : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

export async function saveBodyMetric(entry) {
  try {
    const existing = await getBodyMetrics();
    const entries = existing.entries || [];
    const idx = entries.findIndex(e => e.date === entry.date);
    if (idx >= 0) {
      entries[idx] = entry;
    } else {
      entries.push(entry);
      entries.sort((a, b) => a.date.localeCompare(b.date));
    }
    await window.storage.set(STORAGE_KEYS.BODY_METRICS, JSON.stringify({ entries }));
    return true;
  } catch {
    return false;
  }
}

// ─── Workout Streak ───────────────────────────────────────────────────────────

export async function getWorkoutStreak() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.WORKOUT_STREAK);
    return data?.value ? JSON.parse(data.value) : { currentStreak: 0, longestStreak: 0, lastTrainedDate: null };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastTrainedDate: null };
  }
}

export async function saveWorkoutStreak(streak) {
  try {
    await window.storage.set(STORAGE_KEYS.WORKOUT_STREAK, JSON.stringify(streak));
    return true;
  } catch {
    return false;
  }
}

// ─── Offline Sync Queue ───────────────────────────────────────────────────────

export async function getOfflineSyncQueue() {
  try {
    const data = await window.storage.get(STORAGE_KEYS.OFFLINE_SYNC_QUEUE);
    return data?.value ? JSON.parse(data.value) : { queue: [] };
  } catch {
    return { queue: [] };
  }
}

export async function addToOfflineSyncQueue(type, dateKey, payload) {
  try {
    const existing = await getOfflineSyncQueue();
    const queue = existing.queue || [];
    queue.push({
      id: `${type}-${dateKey}-${Date.now()}`,
      type,
      dateKey,
      payload,
      failedAt: new Date().toISOString(),
      retryCount: 0
    });
    await window.storage.set(STORAGE_KEYS.OFFLINE_SYNC_QUEUE, JSON.stringify({ queue }));
  } catch {}
}

export async function removeFromOfflineSyncQueue(id) {
  try {
    const existing = await getOfflineSyncQueue();
    const queue = (existing.queue || []).filter(item => item.id !== id);
    await window.storage.set(STORAGE_KEYS.OFFLINE_SYNC_QUEUE, JSON.stringify({ queue }));
  } catch {}
}

/**
 * Import data
 */
export async function importData(data) {
  try {
    if (data.workoutLogs) await saveWorkoutLogs(data.workoutLogs);
    if (data.feelings) await window.storage.set(STORAGE_KEYS.FEELINGS, JSON.stringify(data.feelings));
    if (data.nutrition) await window.storage.set(STORAGE_KEYS.NUTRITION, JSON.stringify(data.nutrition));
    if (data.photos) await window.storage.set(STORAGE_KEYS.PHOTOS, JSON.stringify(data.photos));
    if (data.settings) await saveSettings(data.settings);
    if (data.workoutMetadata) await window.storage.set(STORAGE_KEYS.WORKOUT_METADATA, JSON.stringify(data.workoutMetadata));
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}