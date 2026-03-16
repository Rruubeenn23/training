import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, Settings, Sparkles, MessageCircle, Zap, AlertCircle,
  RotateCcw, ChevronLeft, Check, X, Undo2, Dumbbell, Target,
  TrendingUp, Calendar, RefreshCw
} from 'lucide-react';
import {
  getSettings, saveSettings, getDailyFeelings, getWorkoutMetadata
} from '../utils/storageHelper';
import { getAllExercises, getExerciseHistory } from '../utils/storageHelper';
import { getTodayFullInfo, getTodayDateKey } from '../utils/dateUtils';
import { AI_TOOLS, executeTool } from '../utils/aiTools';

// ─── Rubén Profile (always sent as system context) ───────────────────────────
const RUBEN_PROFILE = {
  profile: { name: 'Rubén', age: 21, height_cm: 170, approx_start_weight_kg: 100,
    current_context: { goal: 'Fat loss with muscle maintenance / recomposition', primary_focus: 'Reducir volumen corporal manteniendo fuerza y músculo' }
  },
  medical_context: {
    medication: 'Mounjaro (tirzepatida)', duration_months: 3, initial_progress: '≈1 kg por semana',
    notes: ['Reducción de apetito', 'Menor ingesta calórica espontánea', 'Posible recomposición corporal', 'Mayor sensibilidad a la fatiga en déficit']
  },
  weekly_schedule: {
    training_window: '18:00 - 22:00',
    sports: { friday: 'Fútbol 1h30 (alta intensidad)', sunday_optional: 'Pádel 1h30' }
  },
  nutrition_habits: { protein_target_g_day: '160-180', hydration_focus: true },
  optimization_principles: [
    'Reducir volumen innecesario', 'Priorizar tensión mecánica', 'Evitar fallo absoluto en déficit',
    'Más repeticiones antes que subir peso', 'Minimizar fricción logística', 'Mantener sostenibilidad semanal'
  ],
  overall_status: {
    discipline_level: 'Alto', training_quality: 'Buena técnica y progresión sólida',
    main_risk: 'Acumulación de fatiga + volumen excesivo', current_phase: 'Afinado para recomposición corporal'
  }
};

// ─── Action Card Component ────────────────────────────────────────────────────
function ActionCard({ toolName, summary, success, undoData, onUndo }) {
  const [undone, setUndone] = useState(false);

  const TOOL_ICONS = {
    replace_weekly_plan: Dumbbell,
    modify_day_workout: Calendar,
    create_training_cycle: Target,
    update_exercise_targets: TrendingUp,
    read_current_plan: RefreshCw,
  };

  const Icon = TOOL_ICONS[toolName] || Zap;

  const handleUndo = () => {
    if (undoData && onUndo) {
      onUndo(undoData);
      setUndone(true);
    }
  };

  if (!success) {
    return (
      <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-3 mb-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-200">{summary}</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-2xl p-3 mb-2 transition-all ${
      undone
        ? 'bg-slate-800/50 border-slate-600/30'
        : 'bg-emerald-900/25 border-emerald-500/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          undone ? 'bg-slate-700' : 'bg-emerald-500/20'
        }`}>
          {undone ? <Undo2 className="w-4 h-4 text-slate-400" /> : <Icon className="w-4 h-4 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold mb-0.5 ${undone ? 'text-slate-400' : 'text-emerald-400'}`}>
            {undone ? 'Cambio deshecho' : '✅ Cambios aplicados'}
          </p>
          <p className="text-sm text-slate-200 leading-snug">{summary}</p>
        </div>
        {undoData && !undone && (
          <button
            onClick={handleUndo}
            className="flex-shrink-0 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 transition-all"
          >
            <Undo2 className="w-3 h-3" />
            Deshacer
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main AICoach Component ───────────────────────────────────────────────────
export default function AICoach({
  workoutLogs,
  trainingPlan,
  trainingCycles,
  progressionTargets,
  personalRecords,
  bodyMetrics,
  preloadedMessage,
  onPlanUpdate,
  onCyclesUpdate,
  onClose
}) {
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('groq');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const insightsFetched = useRef(false);

  useEffect(() => {
    loadApiKey();
    addWelcomeMessage();
  }, []);

  // Handle preloaded message (from post-workout summary)
  useEffect(() => {
    if (preloadedMessage && hasApiKey) {
      setInputMessage(preloadedMessage);
    }
  }, [preloadedMessage, hasApiKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadApiKey = async () => {
    const settings = await getSettings();
    if (settings.aiApiKey) {
      setApiKey(settings.aiApiKey);
      setHasApiKey(true);
    }
    if (settings.aiProvider) setAiProvider(settings.aiProvider);
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) { setError('Por favor ingresa una API key válida'); return; }
    const settings = await getSettings();
    settings.aiApiKey = apiKey;
    settings.aiProvider = aiProvider;
    await saveSettings(settings);
    setHasApiKey(true);
    setShowSettings(false);
    setError('');
    addWelcomeMessage();
  };

  const addWelcomeMessage = () => {
    const todayInfo = getTodayFullInfo();
    setMessages([{
      role: 'assistant',
      content: `¡Hola Rubén! Hoy es **${todayInfo.dayName} ${new Date().getDate()} de ${new Date().toLocaleDateString('es-ES', { month: 'long' })}**.

Soy tu coach IA. Además de analizar tu progreso, ahora puedo **gestionar directamente tu app**:

• Crear o modificar tu rutina semanal
• Diseñar ciclos de entrenamiento periodizados
• Ajustar objetivos de peso por ejercicio
• Programar semanas de descarga

¿Qué necesitas?`,
      timestamp: new Date()
    }]);
  };

  const resetConversation = () => {
    if (confirm('¿Reiniciar conversación? Se perderá el historial actual.')) {
      addWelcomeMessage();
      insightsFetched.current = false;
      setInsights(null);
    }
  };

  // ─── Context Builder ────────────────────────────────────────────────────────
  const buildCompleteContext = async () => {
    const todayInfo = getTodayFullInfo();
    const feelings = await getDailyFeelings();
    const metadata = await getWorkoutMetadata();
    const exercises = getAllExercises(workoutLogs);

    const todayWorkout = workoutLogs[todayInfo.dateKey];
    const todayHasWorkout = todayWorkout && Object.keys(todayWorkout).length > 0;

    const recentWorkouts = Object.entries(workoutLogs)
      .sort(([a], [b]) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'))
      .slice(0, 7);

    const exerciseFreq = {};
    Object.values(workoutLogs).forEach(day => {
      Object.keys(day).forEach(ex => { exerciseFreq[ex] = (exerciseFreq[ex] || 0) + 1; });
    });
    const topExercises = Object.entries(exerciseFreq).sort(([, a], [, b]) => b - a).slice(0, 10).map(([ex]) => ex);

    const progressions = {};
    topExercises.forEach(ex => {
      const history = getExerciseHistory(workoutLogs, ex);
      if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        progressions[ex] = {
          sessions: history.length,
          startWeight: first.maxWeight,
          currentWeight: last.maxWeight,
          progress: last.maxWeight - first.maxWeight,
          current1RM: last.estimated1RM,
          lastDate: last.date
        };
      }
    });

    const recentFeelings = Object.entries(feelings)
      .sort(([a], [b]) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'))
      .slice(0, 5);

    // Current plan summary
    const planSummary = trainingPlan?.plan
      ? Object.entries(trainingPlan.plan).map(([day, w]) => {
          const dayName = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }[day];
          const exList = (w.exercises || []).map(e => `${e.name}${e.weight ? ` (${e.weight})` : ''}${e.reps ? ` ${e.reps}` : ''}`).join(', ');
          return `${dayName}: ${w.name} [${w.intensity}] — ${exList || 'Sin ejercicios'}`;
        }).join('\n')
      : 'Plan no disponible';

    // Active cycle
    const activeCycle = trainingCycles?.cycles?.find(c => c.id === trainingCycles?.activeCycleId);

    // Top PRs
    const topPRs = Object.entries(personalRecords || {})
      .slice(0, 8)
      .map(([ex, r]) => `${ex}: ${r.bestWeight?.weight ?? '—'}kg × ${r.bestWeight?.reps ?? '—'} (1RM: ${r.best1RM?.estimated1RM ?? '—'}kg)`);

    // Progression hints
    const readyToProgress = Object.entries(progressionTargets || {})
      .filter(([, t]) => t.readyToProgress)
      .map(([ex, t]) => `${ex} (${t.currentTargetWeight}kg, ${t.sessionsAtCurrentWeight} sesiones)`);

    // Body metrics
    const latestMetric = (bodyMetrics?.entries || []).slice(-1)[0];

    return `=== PERFIL COMPLETO DE RUBÉN ===
${JSON.stringify(RUBEN_PROFILE, null, 2)}

=== FECHA ACTUAL ===
${todayInfo.fullDate} (${todayInfo.dayName})

=== PLAN SEMANAL ACTUAL ===
${planSummary}
Última actualización: ${trainingPlan?.updatedAt ? new Date(trainingPlan.updatedAt).toLocaleDateString('es-ES') : 'N/A'}

${activeCycle ? `=== CICLO DE ENTRENAMIENTO ACTIVO ===
Nombre: ${activeCycle.name}
Semanas: ${activeCycle.totalWeeks} | Inicio: ${activeCycle.startDate}
Fases: ${activeCycle.phases?.map(p => `${p.name} (${p.type}, semanas ${p.weeks?.join(',')}, ${p.repScheme})`).join(' → ')}
` : ''}

=== ENTRENAMIENTO DE HOY ===
${todayHasWorkout ? `Registrado (${todayInfo.dateKey}):
${Object.entries(todayWorkout).map(([ex, sets]) =>
  `${ex}: ${Object.entries(sets).map(([n, d]) => `S${n}=${d.weight}kg×${d.reps}`).join(', ')}`
).join('\n')}` : `Sin registro hoy (${todayInfo.dateKey})`}

=== ENTRENAMIENTOS RECIENTES ===
${recentWorkouts.map(([date, ex]) => {
  const meta = metadata[date];
  return `${date}: ${Object.keys(ex).slice(0, 4).join(', ')} | ${meta?.duration || '—'} | ${meta?.volume || '—'}`;
}).join('\n')}

=== PROGRESIÓN (top ${Object.keys(progressions).length} ejercicios) ===
${Object.entries(progressions).map(([ex, d]) =>
  `${ex}: ${d.startWeight}kg → ${d.currentWeight}kg (+${d.progress}kg en ${d.sessions} sesiones, 1RM: ${d.current1RM?.toFixed(1)}kg)`
).join('\n')}

${readyToProgress.length > 0 ? `=== LISTOS PARA SUBIR PESO ===
${readyToProgress.join('\n')}
` : ''}

=== RÉCORDS PERSONALES ===
${topPRs.join('\n') || 'Sin récords registrados'}

=== SENSACIONES RECIENTES ===
${recentFeelings.map(([date, f]) => `${date}: Energía ${f.energy}/10, Sueño ${f.sleep}/10, Motivación ${f.motivation}/10`).join('\n') || 'Sin datos'}

${latestMetric ? `=== MÉTRICAS CORPORALES ===
Última medición (${latestMetric.date}): ${latestMetric.weight}kg${latestMetric.waistCm ? `, Cintura: ${latestMetric.waistCm}cm` : ''}
` : ''}

=== STATS GLOBALES ===
Total entrenamientos: ${Object.keys(workoutLogs).filter(d => Object.keys(workoutLogs[d]).length > 0).length}
Ejercicios únicos: ${exercises.length}
Más frecuentes: ${topExercises.slice(0, 5).join(', ')}

=== CAPACIDADES DEL COACH ===
Tienes herramientas para modificar la app directamente: replace_weekly_plan, modify_day_workout, create_training_cycle, update_exercise_targets.
Úsalas cuando el usuario pida cambios en su rutina, ciclo o ejercicios. Siempre explica los cambios.`;
  };

  // ─── API Call with Tool Use ─────────────────────────────────────────────────
  const callGroqAPIWithTools = async (context, conversationHistory, newMessage) => {
    const apiMessages = [
      {
        role: 'system',
        content: `Eres el entrenador personal de Rubén y gestor de su app de entrenamiento. Eres experto, directo, práctico y motivador. Cuando el usuario pida cambios en su rutina o plan, USA las herramientas disponibles para aplicarlos directamente en la app — no solo respondas con texto. Siempre explica brevemente qué cambios hiciste y por qué.

CONTEXTO COMPLETO:
${context}`
      }
    ];

    // Add conversation history (skip welcome message)
    const convMessages = conversationHistory
      .slice(1)
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }));

    apiMessages.push(...convMessages);
    apiMessages.push({ role: 'user', content: newMessage });

    // First API call — with tools
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        tools: AI_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Error ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // No tool calls → return text directly
    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls) {
      return {
        text: choice.message.content || '',
        toolResults: []
      };
    }

    // Execute tool calls
    const toolCalls = choice.message.tool_calls;
    const toolResults = [];

    const appState = { trainingPlan, trainingCycles };
    const appSetters = { setTrainingPlan: onPlanUpdate, setTrainingCycles: onCyclesUpdate };

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let toolArgs;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        toolArgs = {};
      }

      const result = await executeTool(toolName, toolArgs, appState, appSetters);
      toolResults.push({ toolCallId: toolCall.id, toolName, toolArgs, result });
    }

    // Second API call — with tool results
    const messagesWithToolResults = [
      ...apiMessages,
      choice.message, // assistant's tool call message
      ...toolResults.map(tr => ({
        role: 'tool',
        tool_call_id: tr.toolCallId,
        content: tr.result.readResult || (tr.result.success ? `Ejecutado: ${tr.result.summary}` : `Error: ${tr.result.summary}`)
      }))
    ];

    const response2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messagesWithToolResults,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response2.ok) {
      const errData = await response2.json();
      throw new Error(errData.error?.message || `Error ${response2.status}`);
    }

    const data2 = await response2.json();
    return {
      text: data2.choices[0].message.content || '',
      toolResults
    };
  };

  // ─── Load Proactive Insights ────────────────────────────────────────────────
  const loadInsights = async (key) => {
    if (insightsFetched.current || !key) return;
    insightsFetched.current = true;
    setInsightsLoading(true);

    try {
      const totalWorkouts = Object.keys(workoutLogs).filter(d => Object.keys(workoutLogs[d]).length > 0).length;
      if (totalWorkouts < 3) { setInsightsLoading(false); return; }

      const context = await buildCompleteContext();
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `Eres el coach de Rubén. ${context}` },
            { role: 'user', content: 'Analiza brevemente los datos de Rubén y genera exactamente 3 insights concretos y accionables. Responde SOLO con un JSON array de strings, sin ningún otro texto. Ejemplo: ["Insight 1", "Insight 2", "Insight 3"]' }
          ],
          temperature: 0.6,
          max_tokens: 400
        })
      });

      if (!response.ok) return;
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      const start = content.indexOf('[');
      const end = content.lastIndexOf(']');
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(content.slice(start, end + 1));
        if (Array.isArray(parsed)) setInsights(parsed);
      }
    } catch {} finally {
      setInsightsLoading(false);
    }
  };

  // ─── Send Message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputMessage.trim() || !hasApiKey) return;

    const userMessage = { role: 'user', content: inputMessage, timestamp: new Date() };
    const msgText = inputMessage;
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    // Load insights on first real message
    if (!insightsFetched.current) loadInsights(apiKey);

    try {
      const context = await buildCompleteContext();
      const { text, toolResults } = await callGroqAPIWithTools(context, messages, msgText);

      const assistantMessage = {
        role: 'assistant',
        content: text,
        toolResults: toolResults.length > 0 ? toolResults : null,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        timestamp: new Date()
      }]);
    }

    setIsLoading(false);
  };

  const handleUndo = (undoData) => {
    if (undoData?.plan) onPlanUpdate(undoData.plan);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '↩️ Cambio deshecho. El plan anterior ha sido restaurado.',
      timestamp: new Date()
    }]);
  };

  const quickPrompts = [
    'Analiza mi progreso general',
    'Crea un nuevo ciclo de fuerza de 6 semanas',
    'Actualiza los pesos de mis ejercicios principales',
    'Haz un día de piernas más intenso',
    'Programa una semana de descarga',
    '¿Qué ejercicios merezco subir de peso?',
  ];

  // ─── Settings Screen ────────────────────────────────────────────────────────
  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button
          onClick={() => { setShowSettings(false); setError(''); }}
          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-5 pt-2 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /><span className="font-medium">Volver</span>
        </button>

        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl mb-6">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Settings className="w-7 h-7" />
              Configurar IA
            </h1>
            <p className="text-purple-100 text-sm">Groq (Llama 3.3) — Gratis, con herramientas</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-slate-800 rounded-2xl p-6 mb-4">
            <h3 className="font-bold mb-4">Groq API Key</h3>
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-green-300">
                ✅ 100% GRATIS<br/>
                ⚡ Ultra rápido (2-3s)<br/>
                🧠 Llama 3.3 70B<br/>
                🔧 Con herramientas (gestiona tu app)<br/>
                ❌ Sin tarjeta de crédito
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">API Key de Groq:</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setError(''); }}
                placeholder="gsk_..."
                className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold mb-2">⚡ Cómo conseguir API key:</p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-300">
                <li>Ve a <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">console.groq.com</a></li>
                <li>Crea cuenta con Google</li>
                <li>Click en "API Keys" → "Create API Key"</li>
                <li>Copia la key (gsk_...) y pégala aquí</li>
              </ol>
            </div>
            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className={`w-full font-semibold py-3 rounded-xl transition-all ${
                apiKey.trim()
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {apiKey.trim() ? '✅ Guardar y activar' : 'Ingresa una API key'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Chat Screen ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between shadow-lg flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-purple-100 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm font-medium">Volver</span>
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Coach IA
          <span className="text-xs bg-white/20 px-2 py-1 rounded">+ Herramientas</span>
        </h1>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button onClick={resetConversation} className="text-purple-100 hover:text-white" title="Reiniciar">
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="text-purple-100 hover:text-white">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {!hasApiKey ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-xl font-bold mb-2">Activa tu Coach IA</h2>
            <p className="text-gray-400 mb-4">Gestiona tu entrenamiento con IA. Gratis con Groq.</p>
            <div className="bg-purple-500/10 border border-purple-500/50 rounded-xl p-4 mb-6 text-sm text-left">
              <p className="font-semibold mb-2 text-purple-300">🔧 Tu coach puede:</p>
              <ul className="space-y-1 text-gray-300 ml-4 list-disc">
                <li>Crear y modificar tu rutina semanal</li>
                <li>Diseñar ciclos periodizados</li>
                <li>Actualizar objetivos de peso</li>
                <li>Analizar tu progreso completo</li>
                <li>Detectar estancamientos</li>
              </ul>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
            >
              Configurar ahora (2 min)
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Insights panel */}
            {(insightsLoading || insights) && (
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Insights de hoy</span>
                </div>
                {insightsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="animate-spin w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full" />
                    Analizando tu progreso...
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div key={idx}>
                {/* Tool results (action cards) */}
                {msg.toolResults && msg.toolResults.map((tr, tidx) => (
                  tr.result.readResult ? null : (
                    <ActionCard
                      key={tidx}
                      toolName={tr.toolName}
                      summary={tr.result.summary}
                      success={tr.result.success}
                      undoData={tr.result.undoData}
                      onUndo={handleUndo}
                    />
                  )
                ))}

                {/* Message bubble */}
                {msg.content && (
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-gray-100'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-purple-400 font-semibold">Coach IA</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                    <span className="text-sm text-gray-400">Analizando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(prompt)}
                    className="bg-slate-800 hover:bg-slate-700 text-sm px-3 py-2 rounded-full whitespace-nowrap transition-colors border border-slate-700/50 text-slate-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-slate-900 border-t border-slate-700 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Pide un cambio de rutina, análisis, ciclo..."
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
            {messages.length > 1 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                🔧 El coach puede modificar tu app directamente
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
