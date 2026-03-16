import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  loadAllUserData,
  upsertWorkout, upsertFeeling, upsertNutrition,
  upsertTrainingPlan, insertTrainingCycle,
  upsertPersonalRecord, upsertBodyMetric,
  updateUserSettings, upsertAIMemory
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

export function AppDataProvider({ children }) {
  const { user } = useAuth();

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
      }
    }
  }, [user, workoutLog, progressionTargets]);

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
      } catch {}
    }
  }, [user]);

  const saveNutrition = useCallback(async (dateKey, data) => {
    setNutrition(prev => ({ ...prev, [dateKey]: data }));
    if (user) {
      try {
        await upsertNutrition(user.id, dateKey, data);
      } catch {}
    }
  }, [user]);

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

  // ─── Offline Queue ──────────────────────────────────────────
  const queueOfflineSync = (type, key, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push({ id: `${type}-${key}-${Date.now()}`, type, key, payload, retries: 0 });
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

    const remaining = [];
    for (const item of queue) {
      try {
        if (item.type === 'workout') {
          await upsertWorkout(user.id, item.key, item.payload.exercises, item.payload.metadata || {});
        } else if (item.type === 'feeling') {
          await upsertFeeling(user.id, item.key, item.payload);
        } else if (item.type === 'nutrition') {
          await upsertNutrition(user.id, item.key, item.payload);
        }
        // Success — don't re-add to queue
      } catch {
        if ((item.retries || 0) < MAX_RETRIES) {
          remaining.push({ ...item, retries: (item.retries || 0) + 1 });
        }
        // Drop items that have exceeded MAX_RETRIES
      }
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    if (remaining.length === 0 && queue.length > 0) {
      console.info(`Offline queue drained: ${queue.length} items synced successfully`);
    }
  }, [user]);

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
    reloadData: loadData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
