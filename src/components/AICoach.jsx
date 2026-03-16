import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, Settings, Sparkles, MessageCircle, Zap, AlertCircle,
  RotateCcw, ChevronLeft, Undo2, Dumbbell, Target,
  TrendingUp, Calendar, RefreshCw, Key
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { buildMemoryPrompt, extractMemoryDeltaFromConversation } from '../utils/aiMemory';
import { getAllExercises, getExerciseHistory } from '../utils/storageHelper';
import { getTodayFullInfo } from '../utils/dateUtils';
import { AI_TOOLS, executeTool } from '../utils/aiTools';

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ toolName, summary, success, undoData, onUndo }) {
  const [undone, setUndone] = useState(false);
  const ICONS = {
    replace_weekly_plan: Dumbbell, modify_day_workout: Calendar,
    create_training_cycle: Target, update_exercise_targets: TrendingUp,
    read_current_plan: RefreshCw,
  };
  const Icon = ICONS[toolName] || Zap;

  if (!success) {
    return (
      <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-3 mb-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-200">{summary}</p>
      </div>
    );
  }
  return (
    <div className={`border rounded-2xl p-3 mb-2 transition-all ${undone ? 'bg-slate-800/50 border-slate-600/30' : 'bg-emerald-900/25 border-emerald-500/30'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${undone ? 'bg-slate-700' : 'bg-emerald-500/20'}`}>
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
            onClick={() => { onUndo?.(undoData); setUndone(true); }}
            className="flex-shrink-0 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 transition-all"
          >
            <Undo2 className="w-3 h-3" /> Deshacer
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AICoach({ preloadedMessage, onClose }) {
  const { user, displayName } = useAuth();
  const {
    workoutLog, workoutMeta, trainingPlan, trainingCycles,
    personalRecords, progressionTargets, bodyMetrics,
    feelings, aiMemory, userSettings,
    savePlan, saveTrainingCycle, updateMemory,
  } = useAppData();

  const [apiKey, setApiKey] = useState('');
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
    const savedKey = localStorage.getItem('groq_api_key') || userSettings?.groq_api_key || '';
    if (savedKey) { setApiKey(savedKey); setHasApiKey(true); }
    addWelcomeMessage();
  }, []);

  useEffect(() => {
    if (preloadedMessage && hasApiKey) setInputMessage(preloadedMessage);
  }, [preloadedMessage, hasApiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveApiKey = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('groq_api_key', apiKey.trim());
    setHasApiKey(true);
    setShowSettings(false);
    setError('');
    addWelcomeMessage();
  };

  const addWelcomeMessage = () => {
    const todayInfo = getTodayFullInfo();
    const name = displayName || 'atleta';
    setMessages([{
      role: 'assistant',
      content: `¡Hola, ${name}! Hoy es **${todayInfo.dayName} ${new Date().getDate()} de ${new Date().toLocaleDateString('es-ES', { month: 'long' })}**.

Soy tu coach IA. Puedo analizar tu progreso y **gestionar directamente tu app**:

• Crear o modificar tu rutina semanal
• Diseñar ciclos de entrenamiento periodizados
• Ajustar objetivos de peso por ejercicio
• Programar semanas de descarga

¿Qué necesitas?`,
      timestamp: new Date(),
    }]);
  };

  const resetConversation = () => {
    if (!confirm('¿Reiniciar conversación?')) return;
    addWelcomeMessage();
    insightsFetched.current = false;
    setInsights(null);
  };

  // ─── Context Builder ────────────────────────────────────────────────────────
  const buildContext = () => {
    const todayInfo = getTodayFullInfo();
    const exercises = getAllExercises(workoutLog);

    const todayWorkout = workoutLog[todayInfo.dateKey];
    const todayHasWorkout = todayWorkout && Object.keys(todayWorkout).length > 0;

    const recentWorkouts = Object.entries(workoutLog)
      .sort(([a], [b]) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'))
      .slice(0, 7);

    const exerciseFreq = {};
    Object.values(workoutLog).forEach(day => {
      Object.keys(day).forEach(ex => { exerciseFreq[ex] = (exerciseFreq[ex] || 0) + 1; });
    });
    const topExercises = Object.entries(exerciseFreq).sort(([, a], [, b]) => b - a).slice(0, 10).map(([ex]) => ex);

    const progressions = {};
    topExercises.forEach(ex => {
      const history = getExerciseHistory(workoutLog, ex);
      if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        progressions[ex] = {
          sessions: history.length,
          startWeight: first.maxWeight,
          currentWeight: last.maxWeight,
          progress: last.maxWeight - first.maxWeight,
          current1RM: last.estimated1RM,
          lastDate: last.date,
        };
      }
    });

    const recentFeelings = Object.entries(feelings || {})
      .sort(([a], [b]) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'))
      .slice(0, 5);

    const planSummary = trainingPlan?.plan
      ? Object.entries(trainingPlan.plan.days || trainingPlan.plan).map(([day, w]) => {
          const dayName = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }[day] || day;
          const exList = (w.exercises || []).map(e => e.name).join(', ');
          return `${dayName}: ${w.name || w.focus || ''} — ${exList || 'Sin ejercicios'}`;
        }).join('\n')
      : 'Sin plan activo';

    const activeCycle = (trainingCycles || []).find(c => c.id === trainingPlan?.activeCycleId);

    const topPRs = Object.entries(personalRecords || {})
      .slice(0, 8)
      .map(([ex, r]) => `${ex}: ${r.bestWeight?.weight ?? '—'}kg × ${r.bestWeight?.reps ?? '—'} (1RM ~${r.best1RM?.estimated1RM ?? '—'}kg)`);

    const readyToProgress = Object.entries(progressionTargets || {})
      .filter(([, t]) => t.readyToProgress)
      .map(([ex, t]) => `${ex} (${t.currentTargetWeight}kg, ${t.sessionsAtCurrentWeight} sesiones)`);

    const latestMetric = (bodyMetrics?.entries || []).slice(-1)[0];

    return `${buildMemoryPrompt(aiMemory)}

=== FECHA ACTUAL ===
${todayInfo.fullDate} (${todayInfo.dayName})

=== PLAN SEMANAL ACTUAL ===
${planSummary}
Última actualización: ${trainingPlan?.updatedAt ? new Date(trainingPlan.updatedAt).toLocaleDateString('es-ES') : 'N/A'}

${activeCycle ? `=== CICLO ACTIVO ===
${activeCycle.name} | ${activeCycle.totalWeeks} semanas | Inicio: ${activeCycle.startDate}
` : ''}
=== HOY ===
${todayHasWorkout
  ? `Entrenado (${todayInfo.dateKey}):\n${Object.entries(todayWorkout).map(([ex, sets]) => `${ex}: ${Object.entries(sets).map(([n, d]) => `S${n}=${d.weight}kg×${d.reps}`).join(', ')}`).join('\n')}`
  : `Sin entrenamiento registrado hoy (${todayInfo.dateKey})`}

=== ÚLTIMOS ENTRENAMIENTOS ===
${recentWorkouts.map(([date, ex]) => {
  const meta = (workoutMeta || {})[date];
  return `${date}: ${Object.keys(ex).slice(0, 4).join(', ')}${meta?.duration ? ` | ${meta.duration}` : ''}`;
}).join('\n') || 'Sin datos'}

=== PROGRESIÓN ===
${Object.entries(progressions).map(([ex, d]) =>
  `${ex}: ${d.startWeight}→${d.currentWeight}kg (+${d.progress}kg, ${d.sessions} sesiones)`
).join('\n') || 'Sin datos suficientes'}

${readyToProgress.length > 0 ? `=== LISTOS PARA SUBIR PESO ===\n${readyToProgress.join('\n')}\n` : ''}

=== RECORDS PERSONALES ===
${topPRs.join('\n') || 'Sin récords'}

=== SENSACIONES RECIENTES ===
${recentFeelings.map(([date, f]) => `${date}: Energía ${f.energy}/10, Sueño ${f.sleep}/10`).join('\n') || 'Sin datos'}

${latestMetric ? `=== MÉTRICAS CORPORALES ===\nÚltima (${latestMetric.date}): ${latestMetric.weight}kg${latestMetric.waistCm ? `, cintura ${latestMetric.waistCm}cm` : ''}\n` : ''}

=== ESTADÍSTICAS ===
Total entrenamientos: ${Object.keys(workoutLog).filter(d => Object.keys(workoutLog[d]).length > 0).length}
Ejercicios únicos: ${exercises.length}

=== HERRAMIENTAS DISPONIBLES ===
Puedes usar: replace_weekly_plan, modify_day_workout, create_training_cycle, update_exercise_targets, read_current_plan.
Úsalas cuando el usuario pida cambios. Explica siempre qué hiciste y por qué.`;
  };

  // ─── Groq API Call ──────────────────────────────────────────────────────────
  const callGroq = async (context, history, newMessage) => {
    const apiMessages = [
      {
        role: 'system',
        content: `Eres el coach personal de ${displayName || 'este usuario'} y gestor de su app de entrenamiento. Eres experto, directo, práctico y motivador. Cuando el usuario pida cambios, USA las herramientas para aplicarlos directamente.

${context}`,
      },
      ...history.slice(1)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
      { role: 'user', content: newMessage },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        tools: AI_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Error ${res.status}`);
    }

    const data = await res.json();
    const choice = data.choices[0];

    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls) {
      return { text: choice.message.content || '', toolResults: [] };
    }

    // Execute tools — wrap AppDataContext methods to match executeTool's expected API
    const appState = { trainingPlan, trainingCycles };
    const appSetters = {
      // executeTool passes full plan object: { plan, name, version, ... }
      setTrainingPlan: async (fullPlan) => {
        const planData = fullPlan.plan || fullPlan;
        const name = fullPlan.name || trainingPlan?.name || 'Mi Plan';
        await savePlan(planData, name);
      },
      // executeTool passes { cycles: [...], activeCycleId }
      setTrainingCycles: async (updated) => {
        const existingIds = (trainingCycles || []).map(c => c.id);
        const newCycles = (updated.cycles || []).filter(c => !existingIds.includes(c.id));
        for (const cycle of newCycles) {
          await saveTrainingCycle(cycle);
        }
      },
    };
    const toolResults = [];

    for (const tc of choice.message.tool_calls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments); } catch {}
      const result = await executeTool(tc.function.name, args, appState, appSetters);
      toolResults.push({ toolCallId: tc.id, toolName: tc.function.name, result });
    }

    // Second call with tool results
    const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...apiMessages,
          choice.message,
          ...toolResults.map(tr => ({
            role: 'tool',
            tool_call_id: tr.toolCallId,
            content: tr.result.readResult || (tr.result.success ? `OK: ${tr.result.summary}` : `Error: ${tr.result.summary}`),
          })),
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!res2.ok) {
      const err = await res2.json();
      throw new Error(err.error?.message || `Error ${res2.status}`);
    }

    const data2 = await res2.json();
    return { text: data2.choices[0].message.content || '', toolResults };
  };

  // ─── Proactive Insights ─────────────────────────────────────────────────────
  const loadInsights = async () => {
    if (insightsFetched.current || !apiKey) return;
    const totalWorkouts = Object.keys(workoutLog).filter(d => Object.keys(workoutLog[d]).length > 0).length;
    if (totalWorkouts < 3) return;

    insightsFetched.current = true;
    setInsightsLoading(true);
    try {
      const context = buildContext();
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `Eres el coach de ${displayName}. ${context}` },
            { role: 'user', content: 'Genera exactamente 3 insights concretos y accionables. Responde SOLO con JSON array de strings: ["Insight 1", "Insight 2", "Insight 3"]' },
          ],
          temperature: 0.6,
          max_tokens: 400,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
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
    if (!inputMessage.trim() || !hasApiKey || isLoading) return;

    const msgText = inputMessage;
    const userMsg = { role: 'user', content: msgText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    if (!insightsFetched.current) loadInsights();

    try {
      const context = buildContext();
      const allMessages = [...messages, userMsg];
      const { text, toolResults } = await callGroq(context, allMessages, msgText);

      const assistantMsg = {
        role: 'assistant',
        content: text,
        toolResults: toolResults.length > 0 ? toolResults : null,
        timestamp: new Date(),
      };
      const newMessages = [...allMessages, assistantMsg];
      setMessages(newMessages);

      // Extract and save memory updates from this conversation
      if (newMessages.length % 4 === 0) {
        extractMemoryDeltaFromConversation(newMessages, aiMemory, apiKey).then(delta => {
          if (delta) {
            Object.entries(delta).forEach(([category, updates]) => {
              updateMemory(category, updates).catch(() => {});
            });
          }
        });
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = (undoData) => {
    if (undoData?.plan) savePlan(undoData.plan.plan || undoData.plan, undoData.plan.name);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '↩️ Cambio deshecho. El plan anterior ha sido restaurado.',
      timestamp: new Date(),
    }]);
  };

  const quickPrompts = [
    'Analiza mi progreso general',
    'Crea un ciclo de fuerza de 6 semanas',
    'Actualiza los pesos de mis ejercicios',
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
          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ChevronLeft size={20} /> Volver
        </button>
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl mb-6">
            <h1 className="text-xl font-bold flex items-center gap-2"><Key size={20} /> Configurar IA</h1>
            <p className="text-purple-100 text-sm mt-1">Groq (Llama 3.3 70B) — Gratis, con herramientas</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-sm text-green-300 space-y-1">
              <p>✅ 100% gratis — sin tarjeta</p>
              <p>⚡ Respuestas en 2-3 segundos</p>
              <p>🧠 Llama 3.3 70B con herramientas</p>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Groq API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-slate-300">
              <p className="font-semibold text-blue-300 mb-2">Cómo obtener API key:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Ve a <span className="text-blue-400">console.groq.com</span></li>
                <li>Crea cuenta con Google</li>
                <li>API Keys → Create API Key</li>
                <li>Copia la key y pégala aquí</li>
              </ol>
            </div>
            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Guardar y activar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Screen ────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        {onClose ? (
          <button onClick={onClose} className="flex items-center gap-1 text-purple-100 hover:text-white transition-colors">
            <ChevronLeft size={20} /> <span className="text-sm font-medium">Volver</span>
          </button>
        ) : <div className="w-16" />}
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Brain size={20} /> Coach IA
        </h1>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button onClick={resetConversation} className="text-purple-200 hover:text-white">
              <RotateCcw size={18} />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="text-purple-200 hover:text-white">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {!hasApiKey ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <Sparkles size={48} className="mx-auto mb-4 text-purple-400" />
            <h2 className="text-xl font-bold mb-2">Activa tu Coach IA</h2>
            <p className="text-slate-400 mb-6">Gestión inteligente de tu entrenamiento. Gratis con Groq.</p>
            <ul className="text-left bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6 text-sm text-slate-300 space-y-1.5">
              <li>🏋️ Crear y modificar tu rutina semanal</li>
              <li>🎯 Diseñar ciclos periodizados</li>
              <li>📈 Actualizar objetivos de peso</li>
              <li>🔍 Analizar tu progreso completo</li>
              <li>🧠 Recordar tu perfil entre conversaciones</li>
            </ul>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl"
            >
              Configurar ahora (2 min)
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2">
            {/* Insights */}
            {(insightsLoading || insights) && (
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-amber-400" />
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
                        <span className="text-amber-400 mt-0.5">•</span>
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
                {msg.toolResults?.map((tr, ti) =>
                  tr.result.readResult ? null : (
                    <ActionCard
                      key={ti}
                      toolName={tr.toolName}
                      summary={tr.result.summary}
                      success={tr.result.success}
                      undoData={tr.result.undoData}
                      onUndo={handleUndo}
                    />
                  )
                )}
                {msg.content && (
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-100'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Brain size={14} className="text-purple-400" />
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
                <div className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                    Analizando...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-xs text-slate-500 mb-2">Sugerencias:</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setInputMessage(p)}
                    className="bg-slate-800 hover:bg-slate-700 text-sm px-3 py-2 rounded-full whitespace-nowrap border border-slate-700/50 text-slate-300 flex-shrink-0 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-safe pb-20 pt-3 bg-slate-900/80 border-t border-slate-800 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Pide cambios, análisis, un nuevo ciclo..."
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 disabled:opacity-40 text-white transition-all"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
