import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  loadAllUserData,
  upsertWorkout, upsertFeeling, upsertNutrition,
  upsertTrainingPlan, insertTrainingCycle,
  upsertPersonalRecord, upsertBodyMetric,
  updateUserSettings, upsertAIMemory,
  getProgressPhotos, insertProgressPhoto, deleteProgressPhoto
} from '../utils/database';
import {
  checkForPR, updatePersonalRecords,
  calculateStreak, calculateProgressionTargets
} from '../utils/progressionEngine';
import { mergeMemoryDelta } from '../utils/aiMemory';
import { getTodayDateKey } from '../utils/dateUtils';

const AppDataContext = createContext(null);

// ─── Offline Queue Helpers ─────────────────────────────────────────────────────
const OFFLINE_QUEUE_KEY = 'offline-sync-queue';
const MAX_RETRIES = 5;
const QUEUE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();

  const [workoutLog, setWorkoutLog] = useState({});
  const [workoutMeta, setWorkoutMeta] = useState({});
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [trainingCycles, setTrainingCycles] = useState([]);
  const [personalRecords, setPersonalRecords] = useState({});
  const [progressionTargets, setProgressionTargets] = useState({});
  const [bodyMetrics, setBodyMetrics] = useState({ entries: [] });
  const [feelings, setFeelings] = useState({});
  const [nutrition, setNutrition] = useState({});
  const [workoutStreak, setWorkoutStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [aiMemory, setAiMemory] = useState(null);
  const [userSettings, setUserSettings] = useState({});
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Load all data when user logs in
  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const data = await loadAllUserData(user.id);

      setWorkoutLog(data.workoutLogs || {});
      setWorkoutMeta(data.workoutMeta || {});
      setTrainingPlan(data.trainingPlan ? {
        plan: data.trainingPlan.plan,
        name: data.trainingPlan.name,
        version: data.trainingPlan.version,
        activeCycleId: data.trainingPlan.active_cycle_id,
        updatedAt: data.trainingPlan.updated_at,
      } : null);
      setTrainingCycles(data.trainingCycles || []);
      setPersonalRecords(data.personalRecords || {});
      setBodyMetrics(data.bodyMetrics || { entries: [] });
      setFeelings(data.feelings || {});
      setNutrition(data.nutrition || {});
      setAiMemory(data.aiMemory);
      setUserSettings(data.settings || {});
      setProgressPhotos(data.progressPhotos || []);

      // If the user already has data, assume onboarding completed locally
      if (user?.id) {
        const hasAnyData =
          (data.trainingPlan && data.trainingPlan.plan) ||
          Object.keys(data.workoutLogs || {}).length > 0 ||
          Object.keys(data.feelings || {}).length > 0 ||
          Object.keys(data.nutrition || {}).length > 0;
        if (hasAnyData) {
          localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
          window.dispatchEvent(new Event('onboarding-local-update'));
        }
      }

      // Recalculate derived data
      const streak = calculateStreak(data.workoutLogs || {});
      setWorkoutStreak(streak);
      const targets = calculateProgressionTargets(
        data.workoutLogs || {}, {}, data.settings?.rest_timer_duration ?? 2
      );
      setProgressionTargets(targets);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      clearData();
    }
  }, [user?.id, loadData]);

  const clearData = () => {
    setWorkoutLog({});
    setWorkoutMeta({});
    setTrainingPlan(null);
    setTrainingCycles([]);
    setPersonalRecords({});
    setProgressionTargets({});
    setBodyMetrics({ entries: [] });
    setFeelings({});
    setNutrition({});
    setWorkoutStreak({ currentStreak: 0, longestStreak: 0 });
    setAiMemory(null);
    setUserSettings({});
    setProgressPhotos([]);
  };

  // ─── Mutations ──────────────────────────────────────────────

  const saveWorkout = useCallback(async (dateKey, exercises, metadata = {}) => {
    const newLog = { ...workoutLog, [dateKey]: exercises };
    setWorkoutLog(newLog);

    // Update streak
    const streak = calculateStreak(newLog);
    setWorkoutStreak(streak);

    // Update progression targets
    const targets = calculateProgressionTargets(newLog, progressionTargets);
    setProgressionTargets(targets);

    if (user) {
      try {
        await upsertWorkout(user.id, dateKey, exercises, metadata);
      } catch (err) {
        console.error('Workout sync failed, queuing:', err);
        queueOfflineSync('workout', dateKey, { exercises, metadata });
        toast.warning('Entrenamiento guardado localmente. Se sincronizará cuando haya conexión.');
      }
    }
  }, [user, workoutLog, progressionTargets, toast]);

  const handleSetSaved = useCallback(async (exerciseName, weight, reps, dateKey, newLog) => {
    await saveWorkout(dateKey, newLog[dateKey] || newLog);

    // PR check
    const prResult = checkForPR(exerciseName, weight, reps, personalRecords);
    if (prResult.isPR) {
      const updatedRecords = updatePersonalRecords(exerciseName, weight, reps, dateKey, personalRecords);
      setPersonalRecords(updatedRecords);
      if (user) {
        try {
          await upsertPersonalRecord(user.id, exerciseName, updatedRecords[exerciseName]);
        } catch {}
      }
      return { isPR: true, prResult };
    }
    return { isPR: false };
  }, [user, personalRecords, saveWorkout]);

  const saveFeeling = useCallback(async (dateKey, feeling) => {
    setFeelings(prev => ({ ...prev, [dateKey]: feeling }));
    if (user) {
      try {
        await upsertFeeling(user.id, dateKey, feeling);
      } catch (err) {
        console.error('Feeling sync failed, queuing:', err);
        queueOfflineSync('feeling', dateKey, feeling);
        toast.warning('Sensación guardada localmente. Se sincronizará cuando haya conexión.');
      }
    }
  }, [user, toast]);

  const saveNutrition = useCallback(async (dateKey, data) => {
    setNutrition(prev => ({ ...prev, [dateKey]: data }));
    if (user) {
      try {
        await upsertNutrition(user.id, dateKey, data);
      } catch (err) {
        console.error('Nutrition sync failed, queuing:', err);
        queueOfflineSync('nutrition', dateKey, data);
        toast.warning('Nutrición guardada localmente. Se sincronizará cuando haya conexión.');
      }
    }
  }, [user, toast]);

  const savePlan = useCallback(async (planData, name) => {
    const newPlan = {
      plan: planData,
      name: name || trainingPlan?.name || 'Mi Plan',
      version: (trainingPlan?.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    setTrainingPlan(newPlan);
    if (user) {
      try {
        await upsertTrainingPlan(user.id, planData, name || 'Mi Plan');
      } catch (err) {
        console.error('Plan sync failed:', err);
      }
    }
  }, [user, trainingPlan]);

  const saveTrainingCycle = useCallback(async (cycle) => {
    const newCycles = [...trainingCycles, cycle];
    setTrainingCycles(newCycles);
    if (user) {
      try {
        const saved = await insertTrainingCycle(user.id, cycle);
        return saved;
      } catch (err) {
        console.error('Cycle sync failed:', err);
      }
    }
  }, [user, trainingCycles]);

  const saveBodyMetric = useCallback(async (entry) => {
    setBodyMetrics(prev => {
      const entries = [...(prev.entries || [])];
      const idx = entries.findIndex(e => e.date === entry.date);
      if (idx >= 0) entries[idx] = entry;
      else { entries.push(entry); entries.sort((a, b) => a.date.localeCompare(b.date)); }
      return { entries };
    });
    if (user) {
      try {
        await upsertBodyMetric(user.id, entry);
      } catch {}
    }
  }, [user]);

  const saveSettings = useCallback(async (updates) => {
    const newSettings = { ...userSettings, ...updates };
    setUserSettings(newSettings);
    if (user) {
      try {
        await updateUserSettings(user.id, updates);
      } catch {}
    }
  }, [user, userSettings]);

  const updateMemory = useCallback(async (category, updates) => {
    const newMemory = mergeMemoryDelta(aiMemory, category, updates);
    setAiMemory(newMemory);
    if (user) {
      try {
        await upsertAIMemory(user.id, newMemory);
      } catch {}
    }
    return newMemory;
  }, [user, aiMemory]);

  const setMemory = useCallback(async (memory) => {
    setAiMemory(memory);
    if (user) {
      try {
        await upsertAIMemory(user.id, memory);
      } catch {}
    }
  }, [user]);

  const addProgressPhoto = useCallback(async (photo) => {
    if (!user) return null;
    try {
      await insertProgressPhoto(user.id, photo);
      const photos = await getProgressPhotos(user.id);
      setProgressPhotos(photos);
      return true;
    } catch (err) {
      console.error('Photo save failed:', err);
      return null;
    }
  }, [user]);

  const removeProgressPhoto = useCallback(async (photoId) => {
    if (!user) return;
    try {
      await deleteProgressPhoto(user.id, photoId);
      setProgressPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('Photo delete failed:', err);
    }
  }, [user]);

  // ─── Offline Queue ──────────────────────────────────────────
  const queueOfflineSync = (type, key, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push({ id: `${type}-${key}-${Date.now()}`, type, key, payload, retries: 0, queuedAt: Date.now() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to queue offline sync:', err);
    }
  };

  const drainOfflineQueue = useCallback(async () => {
    if (!user) return;
    let queue;
    try {
      queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    } catch { return; }
    if (queue.length === 0) return;

    const now = Date.now();
    const remaining = [];
    let synced = 0;
    for (const item of queue) {
      // Drop items older than TTL
      if (item.queuedAt && now - item.queuedAt > QUEUE_TTL_MS) {
        console.warn(`Dropping expired queue item: ${item.id}`);
        continue;
      }
      try {
        if (item.type === 'workout') {
          await upsertWorkout(user.id, item.key, item.payload.exercises, item.payload.metadata || {});
        } else if (item.type === 'feeling') {
          await upsertFeeling(user.id, item.key, item.payload);
        } else if (item.type === 'nutrition') {
          await upsertNutrition(user.id, item.key, item.payload);
        }
        synced++;
        // Success — don't re-add to queue
      } catch {
        if ((item.retries || 0) < MAX_RETRIES) {
          remaining.push({ ...item, retries: (item.retries || 0) + 1 });
        }
        // Drop items that have exceeded MAX_RETRIES
      }
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    if (synced > 0) {
      toast.success(`${synced} elemento${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''} con el servidor.`);
    }
  }, [user, toast]);

  // Drain queue on mount and when coming back online
  useEffect(() => {
    if (!user) return;
    drainOfflineQueue();
    const handleOnline = () => drainOfflineQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, drainOfflineQueue]);

  const value = {
    // State
    workoutLog, workoutMeta,
    trainingPlan, trainingCycles,
    personalRecords, progressionTargets,
    bodyMetrics, feelings, nutrition,
    workoutStreak, aiMemory, userSettings,
    dataLoading,
    // Mutations
    saveWorkout, handleSetSaved,
    saveFeeling, saveNutrition,
    savePlan, saveTrainingCycle,
    saveBodyMetric, saveSettings,
    updateMemory, setMemory,
    progressPhotos, addProgressPhoto, removeProgressPhoto,
    reloadData: loadData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
