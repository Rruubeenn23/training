/**
 * AI Tools — Tool definitions for Groq function calling
 * + executor that bridges AI responses to app state
 *
 * NOTE: Keep schemas flat and simple — Groq's llama models
 * fail with 'failed_generation' on deep nested additionalProperties and $ref.
 * Use arrays of objects instead of nested object maps so required fields are enforced per item.
 */

// ─── Tool Schemas ─────────────────────────────────────────────────────────────
export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'replace_weekly_plan',
      description: 'Replaces the entire weekly training plan. Provide only the days that should have workouts (skip rest days). Each item in the days array must have a day key (lunes/martes/miercoles/jueves/viernes/sabado/domingo), a name, a focus, and an exercises array.',
      parameters: {
        type: 'object',
        required: ['days', 'reason'],
        properties: {
          days: {
            type: 'array',
            description: 'Array of day plans. Only include days with actual workouts.',
            items: {
              type: 'object',
              required: ['day', 'name', 'focus', 'exercises'],
              properties: {
                day: {
                  type: 'string',
                  description: 'Day of week in Spanish: lunes, martes, miercoles, jueves, viernes, sabado, domingo',
                },
                name: {
                  type: 'string',
                  description: 'Workout name, e.g. "Empuje", "Tracción", "Pierna"',
                },
                focus: {
                  type: 'string',
                  description: 'Muscle groups targeted, e.g. "pecho, hombros, tríceps"',
                },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['name', 'sets', 'reps'],
                    properties: {
                      name: { type: 'string' },
                      sets: { type: 'integer' },
                      reps: { type: 'string', description: 'e.g. "8-10" or "3x10"' },
                      rest_seconds: { type: 'integer' },
                      notes: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          reason: { type: 'string', description: 'Brief explanation of why this plan was created' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modify_day_workout',
      description: 'Modifies exercises for one specific day only.',
      parameters: {
        type: 'object',
        required: ['day', 'name', 'focus', 'exercises', 'reason'],
        properties: {
          day: { type: 'string', enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
          name: { type: 'string' },
          focus: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'sets', 'reps'],
              properties: {
                name: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'string' },
                rest_seconds: { type: 'integer' },
                notes: { type: 'string' },
              },
            },
          },
          reason: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_training_cycle',
      description: 'Creates a periodized training cycle (e.g. strength → hypertrophy → deload).',
      parameters: {
        type: 'object',
        required: ['name', 'totalWeeks', 'reason'],
        properties: {
          name: { type: 'string' },
          totalWeeks: { type: 'integer' },
          phases: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'weeks', 'repScheme'],
              properties: {
                name: { type: 'string' },
                weeks: { type: 'integer', description: 'Number of weeks for this phase' },
                repScheme: { type: 'string', description: 'e.g. "4-6" or "8-12"' },
                notes: { type: 'string' },
              },
            },
          },
          reason: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_exercise_targets',
      description: 'Updates weight/rep targets for specific exercises in the plan.',
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
                sets: { type: 'integer' },
                reps: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
          reason: { type: 'string' },
        },
      },
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────
export async function executeTool(toolName, args, appState, appSetters) {
  const { trainingPlan, trainingCycles } = appState;
  const { setTrainingPlan, setTrainingCycles } = appSetters;

  try {
    switch (toolName) {

      case 'replace_weekly_plan': {
        const undoData = { plan: trainingPlan ? { ...trainingPlan } : null };
        // Convert array format → object format { lunes: { name, focus, exercises }, ... }
        let planData = {};
        if (Array.isArray(args.days)) {
          args.days.forEach(d => {
            if (d.day) planData[d.day] = { name: d.name, focus: d.focus, exercises: d.exercises || [] };
          });
        } else if (args.days && typeof args.days === 'object') {
          // Fallback: model sent object format (old schema)
          planData = args.days;
        }
        if (Object.keys(planData).length === 0) {
          return { success: false, summary: 'El plan generado está vacío.', undoData: null };
        }
        await setTrainingPlan({ plan: planData, name: trainingPlan?.name || 'Mi Plan' });
        const dayCount = Object.keys(planData).length;
        const exCount = Object.values(planData).reduce((a, d) => a + (d.exercises?.length || 0), 0);
        return {
          success: true,
          summary: `Plan reemplazado: ${dayCount} días, ${exCount} ejercicios. Razón: ${args.reason}`,
          undoData,
        };
      }

      case 'modify_day_workout': {
        if (!trainingPlan?.plan) return { success: false, summary: 'No hay plan activo.', undoData: null };
        const undoData = { plan: { ...trainingPlan } };
        const currentPlanDays = trainingPlan.plan.days || trainingPlan.plan;
        const updatedDays = {
          ...currentPlanDays,
          [args.day]: { name: args.name, focus: args.focus, exercises: args.exercises },
        };
        const newPlanData = trainingPlan.plan.days ? { ...trainingPlan.plan, days: updatedDays } : updatedDays;
        await setTrainingPlan({ plan: newPlanData, name: trainingPlan.name });
        const dayNames = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
        return {
          success: true,
          summary: `${dayNames[args.day]} actualizado: ${args.exercises.length} ejercicios (${args.focus}). Razón: ${args.reason}`,
          undoData,
        };
      }

      case 'create_training_cycle': {
        const newCycle = {
          name: args.name,
          startDate: new Date().toISOString().split('T')[0],
          totalWeeks: args.totalWeeks,
          phases: args.phases || [],
          reason: args.reason,
        };
        await setTrainingCycles({ cycles: [newCycle] });
        const phaseNames = (args.phases || []).map(p => p.name).join(' → ');
        return {
          success: true,
          summary: `Ciclo creado: "${args.name}" — ${args.totalWeeks} semanas${phaseNames ? '. Fases: ' + phaseNames : ''}`,
          undoData: null,
        };
      }

      case 'update_exercise_targets': {
        if (!trainingPlan?.plan) return { success: false, summary: 'No hay plan activo.', undoData: null };
        const undoData = { plan: { ...trainingPlan } };
        const planDays = trainingPlan.plan.days || trainingPlan.plan;
        const updatedDays = { ...planDays };

        args.updates.forEach(update => {
          Object.keys(updatedDays).forEach(day => {
            const exercises = (updatedDays[day].exercises || []).map(e => {
              if (e.name.toLowerCase() === update.exerciseName.toLowerCase()) {
                return {
                  ...e,
                  ...(update.sets && { sets: update.sets }),
                  ...(update.reps && { reps: update.reps }),
                  ...(update.notes && { notes: update.notes }),
                };
              }
              return e;
            });
            updatedDays[day] = { ...updatedDays[day], exercises };
          });
        });

        const newPlanData = trainingPlan.plan.days ? { ...trainingPlan.plan, days: updatedDays } : updatedDays;
        await setTrainingPlan({ plan: newPlanData, name: trainingPlan.name });
        return {
          success: true,
          summary: `Objetivos actualizados: ${args.updates.map(u => u.exerciseName).join(', ')}. Razón: ${args.reason}`,
          undoData,
        };
      }

      default:
        return { success: false, summary: `Herramienta desconocida: ${toolName}`, undoData: null };
    }
  } catch (err) {
    return { success: false, summary: `Error en ${toolName}: ${err.message}`, undoData: null };
  }
}
