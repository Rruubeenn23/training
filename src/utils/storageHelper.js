/**
 * Helper functions para manejo de storage
 */

const STORAGE_KEYS = {
  WORKOUT_LOGS: 'workout-logs',
  FEELINGS: 'daily-feelings',
  NUTRITION: 'nutrition-logs',
  PHOTOS: 'progress-photos',
  SETTINGS: 'app-settings',
  WORKOUT_METADATA: 'workout-metadata'
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
 * Save workout logs
 */
export async function saveWorkoutLogs(logs) {
  try {
    await window.storage.set(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs));
    return true;
  } catch (error) {
    console.error('Error saving workout logs:', error);
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
 * Save workout metadata
 */
export async function saveWorkoutMetadata(dateKey, metadata) {
  try {
    const allMetadata = await getWorkoutMetadata();
    allMetadata[dateKey] = metadata;
    await window.storage.set(STORAGE_KEYS.WORKOUT_METADATA, JSON.stringify(allMetadata));
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
 * Save daily feeling
 */
export async function saveDailyFeeling(dateKey, feeling) {
  try {
    const allFeelings = await getDailyFeelings();
    allFeelings[dateKey] = feeling;
    await window.storage.set(STORAGE_KEYS.FEELINGS, JSON.stringify(allFeelings));
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
 * Save nutrition log
 */
export async function saveNutritionLog(dateKey, nutritionData) {
  try {
    const allNutrition = await getNutritionLogs();
    allNutrition[dateKey] = nutritionData;
    await window.storage.set(STORAGE_KEYS.NUTRITION, JSON.stringify(allNutrition));
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
    return true;
  } catch (error) {
    console.error('Error saving photo:', error);
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
    calorieGoal: 2200
  };
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