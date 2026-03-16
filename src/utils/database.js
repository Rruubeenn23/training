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
    .select('date, energy, sleep, motivation')
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
    .upsert({
      user_id: userId,
      date,
      energy: feeling.energy,
      sleep: feeling.sleep,
      motivation: feeling.motivation
    }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export async function getNutrition(userId, limit = 30) {
  const { data, error } = await supabase
    .from('nutrition')
    .select('date, protein, carbs, fats, water')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const nutrition = {};
  (data || []).forEach(n => {
    nutrition[n.date] = {
      protein: n.protein, carbs: n.carbs, fats: n.fats, water: n.water
    };
  });
  return nutrition;
}

export async function upsertNutrition(userId, date, data) {
  const { error } = await supabase
    .from('nutrition')
    .upsert({
      user_id: userId, date,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fats: data.fats || 0,
      water: data.water || 0,
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

// ─── Progress Photos ──────────────────────────────────────────────────────────

export async function getProgressPhotos(userId) {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('id, date, image_data, angle, notes, weight_kg, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;

  return (data || []).map(p => ({
    id: p.id,
    date: p.date,
    image: p.image_data,
    angle: p.angle,
    notes: p.notes,
    weightKg: p.weight_kg,
    createdAt: p.created_at
  }));
}

export async function insertProgressPhoto(userId, photo) {
  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: userId,
      date: photo.date || new Date().toISOString().split('T')[0],
      image_data: photo.image,
      angle: photo.angle || null,
      notes: photo.notes || null,
      weight_kg: photo.weightKg || null
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProgressPhoto(userId, photoId) {
  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ─── Batch Load (on app startup) ─────────────────────────────────────────────

export async function loadAllUserData(userId) {
  const [
    profileRes, settingsRes, memoryRes, planRes, cyclesRes,
    workoutsRes, feelingsRes, nutritionRes, prRes, metricsRes, photosRes
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
    getProgressPhotos(userId),
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
    progressPhotos: photosRes.status === 'fulfilled' ? photosRes.value : [],
  };
}
