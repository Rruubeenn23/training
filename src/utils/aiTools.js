/**
 * AI Tools — Tool definitions for Groq function calling
 * + executor that bridges AI responses to app state
 */

import { saveTrainingPlan, saveTrainingCycles } from './storageHelper';

// ─── Tool Schemas (sent to Groq API) ─────────────────────────────────────────
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'replace_weekly_plan',
      description: 'Replaces the entire weekly training plan with a new one. Use when the user asks for a completely new routine or a new training split.',
      parameters: {
        type: 'object',
        required: ['plan', 'reason'],
        properties: {
          plan: {
            type: 'object',
            description: 'Map of day name (lunes/martes/miercoles/jueves/viernes/sabado/domingo) to workout object.',
            additionalProperties: {
              type: 'object',
              required: ['name', 'emoji', 'muscle', 'intensity', 'exercises'],
              properties: {
                name: { type: 'string', description: 'Workout name, e.g. "Empuje Fuerte"' },
                emoji: { type: 'string', description: 'Single emoji representing the workout' },
                muscle: { type: 'string', description: 'Muscle groups targeted' },
                intensity: { type: 'string', enum: ['Muy Baja', 'Baja', 'Media-Baja', 'Media', 'Medio-Alto', 'Alta', 'Muy Alta'] },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                      name: { type: 'string' },
                      weight: { type: 'string', description: 'Target weight(s), e.g. "60/65/70 kg" or "Medio"' },
                      reps: { type: 'string', description: 'Rep scheme, e.g. "3×8-10" or "8/6-8/5-6"' },
                      notes: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          reason: { type: 'string', description: 'Why this plan is recommended' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'modify_day_workout',
      description: 'Modifies the exercises for a single day without changing other days. Use when the user wants to adjust one specific day.',
      parameters: {
        type: 'object',
        required: ['day', 'exercises', 'reason'],
        properties: {
          day: { type: 'string', enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
          name: { type: 'string', description: 'Optional new workout name for this day' },
          muscle: { type: 'string', description: 'Optional new muscle group description' },
          intensity: { type: 'string', enum: ['Muy Baja', 'Baja', 'Media-Baja', 'Media', 'Medio-Alto', 'Alta', 'Muy Alta'] },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                weight: { type: 'string' },
                reps: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_training_cycle',
      description: 'Creates a multi-week periodized training cycle (e.g. strength → hypertrophy → deload). Sets it as the active cycle.',
      parameters: {
        type: 'object',
        required: ['name', 'startDate', 'totalWeeks', 'phases', 'reason'],
        properties: {
          name: { type: 'string', description: 'Cycle name, e.g. "Ciclo Fuerza — Marzo 2026"' },
          startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
          totalWeeks: { type: 'integer', minimum: 2, maximum: 16 },
          phases: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'type', 'weeks'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['strength', 'hypertrophy', 'deload', 'power'] },
                weeks: { type: 'array', items: { type: 'integer' }, description: 'Week numbers (1-indexed)' },
                repScheme: { type: 'string', description: 'Rep range for this phase, e.g. "4-6" or "8-12"' },
                intensityModifier: { type: 'number', description: 'Multiplier on weights, e.g. 0.7 for deload' },
                notes: { type: 'string' }
              }
            }
          },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_exercise_targets',
      description: 'Updates weight and rep targets for specific exercises across the weekly plan. Use when the user needs to progress or adjust specific lifts.',
      parameters: {
        type: 'object',
        required: ['updates', 'reason'],
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['exerciseName'],
              properties: {
                exerciseName: { type: 'string' },
                weight: { type: 'string', description: 'New target weight' },
                reps: { type: 'string', description: 'New rep scheme' },
                notes: { type: 'string' }
              }
            }
          },
          reason: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_current_plan',
      description: 'Returns the current weekly training plan. Use this before suggesting changes to understand the current state.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

/**
 * Execute a tool call from the AI
 * @param {string} toolName
 * @param {object} args
 * @param {object} appState - { trainingPlan, trainingCycles }
 * @param {object} appSetters - { setTrainingPlan, setTrainingCycles }
 * @returns {{ success: boolean, summary: string, undoData: object|null, readResult: string|null }}
 */
export async function executeTool(toolName, args, appState, appSetters) {
  const { trainingPlan, trainingCycles } = appState;
  const { setTrainingPlan, setTrainingCycles } = appSetters;

  try {
    switch (toolName) {

      case 'replace_weekly_plan': {
        const undoData = { plan: { ...trainingPlan } };
        const newPlan = {
          ...(trainingPlan || {}),
          version: (trainingPlan?.version || 0) + 1,
          updatedAt: new Date().toISOString(),
          plan: args.plan
        };
        await saveTrainingPlan(newPlan);
        setTrainingPlan(newPlan);
        const dayCount = Object.keys(args.plan).length;
        const exerciseCount = Object.values(args.plan).reduce((a, d) => a + (d.exercises?.length || 0), 0);
        return {
          success: true,
          summary: `Plan semanal reemplazado: ${dayCount} días, ${exerciseCount} ejercicios totales. Razón: ${args.reason}`,
          undoData
        };
      }

      case 'modify_day_workout': {
        if (!trainingPlan?.plan) {
          return { success: false, summary: 'No hay plan activo para modificar.', undoData: null };
        }
        const undoData = { plan: { ...trainingPlan } };
        const currentDay = trainingPlan.plan[args.day] || {};
        const updatedDay = {
          ...currentDay,
          exercises: args.exercises,
          ...(args.name && { name: args.name }),
          ...(args.muscle && { muscle: args.muscle }),
          ...(args.intensity && { intensity: args.intensity }),
        };
        const newPlan = {
          ...trainingPlan,
          updatedAt: new Date().toISOString(),
          plan: { ...trainingPlan.plan, [args.day]: updatedDay }
        };
        await saveTrainingPlan(newPlan);
        setTrainingPlan(newPlan);
        const dayName = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }[args.day];
        return {
          success: true,
          summary: `${dayName} actualizado: ${args.exercises.length} ejercicios. Razón: ${args.reason}`,
          undoData
        };
      }

      case 'create_training_cycle': {
        const id = `cycle-${Date.now()}`;
        const newCycle = {
          id,
          name: args.name,
          createdAt: new Date().toISOString(),
          startDate: args.startDate,
          totalWeeks: args.totalWeeks,
          phases: args.phases,
          reason: args.reason
        };
        const currentCycles = trainingCycles || { cycles: [], activeCycleId: null };
        const updated = {
          cycles: [...currentCycles.cycles, newCycle],
          activeCycleId: id
        };
        await saveTrainingCycles(updated);
        setTrainingCycles(updated);
        const phaseNames = args.phases.map(p => `${p.name} (${p.weeks.length} sem.)`).join(' → ');
        return {
          success: true,
          summary: `Ciclo creado: "${args.name}" — ${args.totalWeeks} semanas. Fases: ${phaseNames}`,
          undoData: null
        };
      }

      case 'update_exercise_targets': {
        if (!trainingPlan?.plan) {
          return { success: false, summary: 'No hay plan activo.', undoData: null };
        }
        const undoData = { plan: { ...trainingPlan } };
        const updatedPlan = { ...trainingPlan.plan };
        let updatedCount = 0;

        args.updates.forEach(update => {
          Object.keys(updatedPlan).forEach(day => {
            const exercises = updatedPlan[day].exercises || [];
            const exIdx = exercises.findIndex(e => e.name.toLowerCase() === update.exerciseName.toLowerCase());
            if (exIdx >= 0) {
              const updatedExercises = [...exercises];
              updatedExercises[exIdx] = {
                ...updatedExercises[exIdx],
                ...(update.weight && { weight: update.weight }),
                ...(update.reps && { reps: update.reps }),
                ...(update.notes && { notes: update.notes }),
              };
              updatedPlan[day] = { ...updatedPlan[day], exercises: updatedExercises };
              updatedCount++;
            }
          });
        });

        const newPlan = { ...trainingPlan, plan: updatedPlan, updatedAt: new Date().toISOString() };
        await saveTrainingPlan(newPlan);
        setTrainingPlan(newPlan);
        const names = args.updates.map(u => u.exerciseName).join(', ');
        return {
          success: true,
          summary: `Objetivos actualizados para: ${names} (${updatedCount} entradas modificadas). Razón: ${args.reason}`,
          undoData
        };
      }

      case 'read_current_plan': {
        if (!trainingPlan?.plan) {
          return { success: true, summary: '', readResult: 'No hay plan activo.', undoData: null };
        }
        const planSummary = Object.entries(trainingPlan.plan).map(([day, w]) => {
          const dayName = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }[day];
          const exList = w.exercises?.map(e => `${e.name} (${e.weight || '—'} · ${e.reps || '—'})`).join(', ') || 'Sin ejercicios';
          return `${dayName}: ${w.name} [${w.intensity}] — ${exList}`;
        }).join('\n');
        return { success: true, summary: '', readResult: planSummary, undoData: null };
      }

      default:
        return { success: false, summary: `Herramienta desconocida: ${toolName}`, undoData: null };
    }
  } catch (err) {
    return { success: false, summary: `Error ejecutando ${toolName}: ${err.message}`, undoData: null };
  }
}
