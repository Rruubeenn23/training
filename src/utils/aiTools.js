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
      description: 'Creates a periodized training cycle (e.g. strength → hypertrophy → deload). All parameters must be plain strings or numbers, never objects.',
      parameters: {
        type: 'object',
        required: ['name', 'total_weeks', 'phases_text', 'reason'],
        properties: {
          name: {
            type: 'string',
            description: 'Short cycle name, e.g. "Ciclo Fuerza-Hipertrofia 6 semanas"',
          },
          total_weeks: {
            type: 'number',
            description: 'Total number of weeks as a plain number, e.g. 6',
          },
          phases_text: {
            type: 'string',
            description: 'Describe each phase on one line separated by " | ". Example: "Semanas 1-2: Fuerza (4-6 reps, 85% 1RM) | Semanas 3-4: Hipertrofia (8-12 reps, 70% 1RM) | Semanas 5-6: Descarga (12-15 reps, 60% 1RM)"',
          },
          reason: {
            type: 'string',
            description: 'Brief explanation of why this cycle was created',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for real-time information: local businesses, gyms, prices, schedules, news, products, places, etc. Use type="places" when the user asks about physical locations or businesses near a specific place. Use type="search" for general web queries.',
      parameters: {
        type: 'object',
        required: ['query', 'type'],
        properties: {
          query: {
            type: 'string',
            description: 'Search query. Be specific: include city/town name for local searches. Write in Spanish for Spanish results.',
          },
          type: {
            type: 'string',
            enum: ['places', 'search'],
            description: 'Use "places" for local business/location searches (gyms, shops, restaurants, etc). Use "search" for general web information.',
          },
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
  const { trainingPlan, trainingCycles, serperKey } = appState;
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
        // Parse phases_text "Phase A | Phase B | Phase C" into structured array
        const phasesText = typeof args.phases_text === 'string' ? args.phases_text : '';
        const phases = phasesText
          ? phasesText.split('|').map(p => ({ name: p.trim() })).filter(p => p.name)
          : [];
        const totalWeeks = Number(args.total_weeks || args.totalWeeks || 4);
        const cycleName = String(args.name || 'Ciclo de entrenamiento');
        const newCycle = {
          name: cycleName,
          startDate: new Date().toISOString().split('T')[0],
          totalWeeks,
          phases,
          phases_text: phasesText,
          reason: String(args.reason || ''),
        };
        await setTrainingCycles({ cycles: [newCycle] });
        const phaseNames = phases.map(p => p.name).join(' → ');
        return {
          success: true,
          summary: `Ciclo creado: "${cycleName}" — ${totalWeeks} semanas${phaseNames ? '. Fases: ' + phaseNames : ''}`,
          undoData: null,
        };
      }

      case 'update_exercise_targets': {
        if (!trainingPlan?.plan) return { success: false, summary: 'No hay plan activo.', undoData: null };
        const undoData = { plan: { ...trainingPlan } };
        const planDays = trainingPlan.plan.days || trainingPlan.plan;
        const updatedDays = { ...planDays };
        const updates = Array.isArray(args.updates) ? args.updates : [];

        updates.forEach(update => {
          const exName = String(update.exerciseName || '');
          if (!exName) return;
          Object.keys(updatedDays).forEach(day => {
            const exercises = (updatedDays[day].exercises || []).map(e => {
              if (String(e.name).toLowerCase() === exName.toLowerCase()) {
                return {
                  ...e,
                  ...(update.sets != null && { sets: Number(update.sets) }),
                  ...(update.reps != null && { reps: String(update.reps) }),
                  ...(update.notes != null && { notes: String(update.notes) }),
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
          summary: `Objetivos actualizados: ${updates.map(u => u.exerciseName).join(', ')}. Razón: ${String(args.reason || '')}`,
          undoData,
        };
      }

      case 'web_search': {
        if (!serperKey) {
          return {
            success: false,
            summary: 'No hay clave de búsqueda web configurada.',
            readResult: 'Error: No Serper API key. Tell the user to add a Serper API key in Coach settings to enable web search.',
          };
        }
        const endpoint = args.type === 'places'
          ? 'https://google.serper.dev/places'
          : 'https://google.serper.dev/search';
        const fetchRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
          body: JSON.stringify({ q: args.query, gl: 'es', hl: 'es', num: 8 }),
        });
        if (!fetchRes.ok) {
          return { success: false, summary: `Error de búsqueda: ${fetchRes.status}`, readResult: `HTTP ${fetchRes.status}` };
        }
        const data = await fetchRes.json();
        const places = (data.places || []).slice(0, 6);
        const organic = (data.organic || []).slice(0, 6);

        // Compact summary sent back to the AI as tool result
        const readResult = places.length > 0
          ? JSON.stringify({ places: places.map(p => ({ name: p.title, address: p.address, rating: p.rating, ratingCount: p.ratingCount, category: p.category, phone: p.phoneNumber, website: p.website, lat: p.latitude, lng: p.longitude })) })
          : JSON.stringify({ results: organic.map(r => ({ title: r.title, url: r.link, snippet: r.snippet, date: r.date })) });

        return {
          success: true,
          summary: places.length > 0
            ? `${places.length} lugares encontrados para "${args.query}"`
            : `${organic.length} resultados web para "${args.query}"`,
          searchData: { places, organic, query: args.query, type: args.type },
          readResult,
        };
      }

      default:
        return { success: false, summary: `Herramienta desconocida: ${toolName}`, undoData: null };
    }
  } catch (err) {
    return { success: false, summary: `Error en ${toolName}: ${err.message}`, undoData: null };
  }
}
