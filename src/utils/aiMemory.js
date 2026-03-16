/**
 * AI Memory helpers — read, write, and format AI memory
 */

import { upsertAIMemory } from './database';

export const EMPTY_MEMORY = {
  profile_facts: {},
  training_preferences: {},
  performance_notes: [],
  observations: [],
  goals: {}
};

/**
 * Format AI memory into a system prompt section
 */
export function buildMemoryPrompt(memory) {
  if (!memory) return '=== AI MEMORY ===\nNo hay memoria guardada todavía.';

  const { profile_facts: pf, training_preferences: tp, performance_notes: pn, observations: obs, goals } = memory;

  const lines = ['=== PERFIL Y MEMORIA DEL USUARIO ==='];

  if (pf && Object.keys(pf).length > 0) {
    lines.push('\nDATOS PERSONALES:');
    if (pf.name) lines.push(`  Nombre: ${pf.name}`);
    if (pf.age) lines.push(`  Edad: ${pf.age} años`);
    if (pf.height_cm) lines.push(`  Altura: ${pf.height_cm} cm`);
    if (pf.weight_kg) lines.push(`  Peso: ${pf.weight_kg} kg`);
    if (pf.goal) lines.push(`  Objetivo: ${pf.goal}`);
    if (pf.experience_level) lines.push(`  Experiencia: ${pf.experience_level}`);
    if (pf.available_days) lines.push(`  Días disponibles: ${pf.available_days}`);
    if (pf.equipment) lines.push(`  Equipamiento: ${Array.isArray(pf.equipment) ? pf.equipment.join(', ') : pf.equipment}`);
    if (pf.injuries && pf.injuries.length > 0) lines.push(`  Lesiones/limitaciones: ${Array.isArray(pf.injuries) ? pf.injuries.join(', ') : pf.injuries}`);
    if (pf.sports) lines.push(`  Deportes/actividades: ${pf.sports}`);
    if (pf.medication_notes) lines.push(`  Contexto médico: ${pf.medication_notes}`);
    if (pf.activity_level) lines.push(`  Nivel de actividad: ${pf.activity_level}`);
  }

  if (tp && Object.keys(tp).length > 0) {
    lines.push('\nPREFERENCIAS DE ENTRENAMIENTO:');
    if (tp.split_type) lines.push(`  Split: ${tp.split_type}`);
    if (tp.preferred_intensity) lines.push(`  Intensidad preferida: ${tp.preferred_intensity}`);
    if (tp.time_per_session_min) lines.push(`  Tiempo por sesión: ~${tp.time_per_session_min} min`);
    if (tp.liked_exercises?.length > 0) lines.push(`  Ejercicios favoritos: ${tp.liked_exercises.join(', ')}`);
    if (tp.disliked_exercises?.length > 0) lines.push(`  Ejercicios que evitar: ${tp.disliked_exercises.join(', ')}`);
  }

  if (goals && Object.keys(goals).length > 0) {
    lines.push('\nOBJETIVOS:');
    if (goals.primary_goal) lines.push(`  Principal: ${goals.primary_goal}`);
    if (goals.secondary_goals?.length > 0) lines.push(`  Secundarios: ${goals.secondary_goals.join(', ')}`);
    if (goals.target_weight_kg) lines.push(`  Peso objetivo: ${goals.target_weight_kg} kg`);
    if (goals.target_date) lines.push(`  Fecha objetivo: ${goals.target_date}`);
  }

  if (pn && pn.length > 0) {
    lines.push('\nNOTAS DE RENDIMIENTO (recientes):');
    pn.slice(-5).forEach(n => lines.push(`  [${n.date}] ${n.note}${n.exercise ? ` (${n.exercise})` : ''}`));
  }

  if (obs && obs.length > 0) {
    lines.push('\nOBSERVACIONES DEL COACH (recientes):');
    obs.slice(-5).forEach(o => lines.push(`  [${o.date}] ${o.observation}`));
  }

  lines.push('\n=== FIN DE MEMORIA ===');
  return lines.join('\n');
}

/**
 * Merge a memory delta into the existing memory
 */
export function mergeMemoryDelta(existing, category, updates) {
  const base = existing || { ...EMPTY_MEMORY };

  if (category === 'performance_notes' || category === 'observations') {
    // Arrays: append new entry
    return {
      ...base,
      [category]: [
        ...(base[category] || []).slice(-49),
        { date: new Date().toISOString().split('T')[0], ...updates }
      ]
    };
  } else {
    // Objects: deep merge
    return {
      ...base,
      [category]: { ...(base[category] || {}), ...updates }
    };
  }
}

/**
 * Convert onboarding collected data into AI memory format
 */
export function onboardingDataToMemory(data) {
  return {
    profile_facts: {
      name: data.name,
      age: data.age ? parseInt(data.age) : null,
      weight_kg: data.weight ? parseFloat(data.weight) : null,
      height_cm: data.height ? parseFloat(data.height) : null,
      goal: data.goal,
      experience_level: data.experience,
      available_days: data.daysPerWeek,
      preferred_days: data.preferredDays || [],
      equipment: data.equipment || [],
      injuries: data.injuries || [],
      activity_level: data.activityLevel,
      sports: data.sports || null,
      medication_notes: data.medicationNotes || null,
    },
    training_preferences: {
      split_type: inferSplitType(data),
      available_days: data.daysPerWeek,
    },
    goals: {
      primary_goal: data.goal,
      secondary_goals: [],
    },
    performance_notes: [],
    observations: [{
      date: new Date().toISOString().split('T')[0],
      observation: `Usuario completó el onboarding. Objetivo: ${data.goal}, Experiencia: ${data.experience}, Días: ${data.daysPerWeek}, Equipamiento: ${Array.isArray(data.equipment) ? data.equipment.join(', ') : data.equipment}`
    }]
  };
}

function inferSplitType(data) {
  const days = parseInt(data.daysPerWeek) || 3;
  if (days <= 2) return 'fullbody';
  if (days === 3) return 'fullbody o push-pull-legs';
  if (days === 4) return 'upper-lower o push-pull';
  return 'push-pull-legs o bro split';
}

/**
 * Extract memory updates from a conversation (calls Groq)
 * Returns delta object or null if nothing to update
 */
export async function extractMemoryDeltaFromConversation(messages, existingMemory, apiKey) {
  if (!apiKey || messages.length < 3) return null;

  const recentMessages = messages.slice(-8).map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.slice(0, 500) : ''}`).join('\n');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a memory extractor. Analyze the conversation and extract any NEW facts about the user that should be saved.

Current memory (already known): ${JSON.stringify(existingMemory?.profile_facts || {}).slice(0, 500)}

Respond ONLY with a JSON object like this (include only categories that have new info):
{
  "profile_facts": { "key": "value" },
  "training_preferences": { "key": "value" },
  "goals": { "key": "value" }
}

Or respond with {} if there's nothing new to save. Never repeat already-known information.`
          },
          {
            role: 'user',
            content: `Conversation:\n${recentMessages}\n\nExtract any new user facts to remember.`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(content.slice(start, end + 1));
      if (Object.keys(parsed).length === 0) return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
