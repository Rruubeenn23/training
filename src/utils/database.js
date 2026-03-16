/**
 * Database layer — all Supabase CRUD operations
 * All functions require userId (from Supabase Auth, never hardcoded)
 */

import { supabase } from '../lib/supabase';

// ─── Profile & Settings ───────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserSettings(userId, updates) {
  const { data, error } = await supabase
    .from('user_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── AI Memory ────────────────────────────────────────────────────────────────

export async function getAIMemory(userId) {
  const { data, error } = await supabase
    .from('ai_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertAIMemory(userId, memory) {
  const { data, error } = await supabase
    .from('ai_memory')
    .upsert({
      user_id: userId,
      ...memory,
      last_updated_at: new Date().toISOString(),
      memory_version: (memory.memory_version || 0) + 1
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Training Plan ────────────────────────────────────────────────────────────

export async function getTrainingPlan(userId) {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertTrainingPlan(userId, planData, name = 'Mi Plan') {
  // Get existing active plan
  const existing = await getTrainingPlan(userId);

  if (existing) {
    const { data, error } = await supabase
      .from('training_plans')
      .update({
        plan: planData,
        name,
        version: (existing.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('training_plans')
      .insert({
        user_id: userId,
        plan: planData,
        name,
        is_active: true,
        version: 1
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ─── Training Cycles ──────────────────────────────────────────────────────────

export async function getTrainingCycles(userId) {
  const { data, error } = await supabase
    .from('training_cycles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function insertTrainingCycle(userId, cycle) {
  const { data, error } = await supabase
    .from('training_cycles')
    .insert({ user_id: userId, ...cycle })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function getWorkouts(userId, limit = 90) {
  const { data, error } = await supabase
    .from('workouts')
    .select('date, exercises, metadata')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  // Convert to { dateKey: exercises } format
  const logs = {};
  const meta = {};
  (data || []).forEach(w => {
    logs[w.date] = w.exercises;
    if (w.metadata) meta[w.date] = w.metadata;
  });
  return { logs, meta };
}

export async function upsertWorkout(userId, date, exercises, metadata = {}) {
  const { error } = await supabase
    .from('workouts')
    .upsert({
      user_id: userId,
      date,
      exercises,
      metadata,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ─── Feelings ────────────────────────────────────────────────────────────────

export async function getFeelings(userId, limit = 30) {
  const { data, error } = await supabase
    .from('feelings')
    .select('date, energy, sleep, motivation, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const feelings = {};
  (data || []).forEach(f => { feelings[f.date] = f; });
  return feelings;
}

export async function upsertFeeling(userId, date, feeling) {
  const { error } = await supabase
    .from('feelings')
    .upsert({ user_id: userId, date, ...feeling }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export async function getNutrition(userId, limit = 30) {
  const { data, error } = await supabase
    .from('nutrition')
    .select('date, protein_g, carbs_g, fats_g, water_glasses, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const nutrition = {};
  (data || []).forEach(n => {
    nutrition[n.date] = {
      protein: n.protein_g, carbs: n.carbs_g, fats: n.fats_g,
      water: n.water_glasses, notes: n.notes
    };
  });
  return nutrition;
}

export async function upsertNutrition(userId, date, data) {
  const { error } = await supabase
    .from('nutrition')
    .upsert({
      user_id: userId, date,
      protein_g: data.protein || 0,
      carbs_g: data.carbs || 0,
      fats_g: data.fats || 0,
      water_glasses: data.water || 0,
      notes: data.notes || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export async function getPersonalRecords(userId) {
  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_name, best_weight, best_1rm, history')
    .eq('user_id', userId);
  if (error) throw error;

  const records = {};
  (data || []).forEach(r => {
    records[r.exercise_name] = {
      bestWeight: r.best_weight,
      best1RM: r.best_1rm,
      history: r.history || []
    };
  });
  return records;
}

export async function upsertPersonalRecord(userId, exerciseName, record) {
  const { error } = await supabase
    .from('personal_records')
    .upsert({
      user_id: userId,
      exercise_name: exerciseName,
      best_weight: record.bestWeight,
      best_1rm: record.best1RM,
      history: record.history || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,exercise_name' });
  if (error) throw error;
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

export async function getBodyMetrics(userId) {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('date, weight_kg, body_fat_pct, waist_cm, notes')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (error) throw error;

  return { entries: (data || []).map(e => ({
    date: e.date,
    weight: e.weight_kg,
    bodyFatPct: e.body_fat_pct,
    waistCm: e.waist_cm,
    notes: e.notes
  })) };
}

export async function upsertBodyMetric(userId, entry) {
  const { error } = await supabase
    .from('body_metrics')
    .upsert({
      user_id: userId,
      date: entry.date,
      weight_kg: entry.weight,
      body_fat_pct: entry.bodyFatPct || null,
      waist_cm: entry.waistCm || null,
      notes: entry.notes || null
    }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

export async function getExercises(userId) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createExercise(userId, exercise) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({ user_id: userId, ...exercise, is_custom: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Batch Load (on app startup) ─────────────────────────────────────────────

export async function loadAllUserData(userId) {
  const [
    profileRes, settingsRes, memoryRes, planRes, cyclesRes,
    workoutsRes, feelingsRes, nutritionRes, prRes, metricsRes
  ] = await Promise.allSettled([
    getProfile(userId),
    getUserSettings(userId),
    getAIMemory(userId),
    getTrainingPlan(userId),
    getTrainingCycles(userId),
    getWorkouts(userId, 180),
    getFeelings(userId, 60),
    getNutrition(userId, 60),
    getPersonalRecords(userId),
    getBodyMetrics(userId),
  ]);

  return {
    profile: profileRes.status === 'fulfilled' ? profileRes.value : null,
    settings: settingsRes.status === 'fulfilled' ? settingsRes.value : {},
    aiMemory: memoryRes.status === 'fulfilled' ? memoryRes.value : null,
    trainingPlan: planRes.status === 'fulfilled' ? planRes.value : null,
    trainingCycles: cyclesRes.status === 'fulfilled' ? cyclesRes.value : [],
    workoutLogs: workoutsRes.status === 'fulfilled' ? workoutsRes.value.logs : {},
    workoutMeta: workoutsRes.status === 'fulfilled' ? workoutsRes.value.meta : {},
    feelings: feelingsRes.status === 'fulfilled' ? feelingsRes.value : {},
    nutrition: nutritionRes.status === 'fulfilled' ? nutritionRes.value : {},
    personalRecords: prRes.status === 'fulfilled' ? prRes.value : {},
    bodyMetrics: metricsRes.status === 'fulfilled' ? metricsRes.value : { entries: [] },
  };
}
