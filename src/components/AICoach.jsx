import React, { useState, useEffect } from 'react';
import { Brain, Settings, Sparkles, MessageCircle, Zap, AlertCircle, RotateCcw } from 'lucide-react';
import { getSettings, saveSettings, getDailyFeelings, getWorkoutMetadata } from '../utils/storageHelper';
import { getAllExercises, getExerciseHistory } from '../utils/storageHelper';
import { getTodayFullInfo, getTodayDateKey } from '../utils/dateUtils';

// PERFIL COMPLETO DE RUBÉN - SIEMPRE INCLUIDO EN EL CONTEXTO
const RUBEN_PROFILE = {
  "profile": {
    "name": "Rubén",
    "age": 21,
    "height_cm": 170,
    "approx_start_weight_kg": 100,
    "current_context": {
      "goal": "Fat loss with muscle maintenance / recomposition",
      "primary_focus": "Reducir volumen corporal manteniendo fuerza y músculo",
      "aesthetic_goal": "Verme más fino y definido"
    }
  },
  "medical_context": {
    "medication": "Mounjaro (tirzepatida)",
    "duration_months": 3,
    "initial_progress": "≈1 kg por semana",
    "current_status": "Estancamiento de peso las últimas 3 semanas",
    "notes": [
      "Reducción de apetito",
      "Menor ingesta calórica espontánea",
      "Posible recomposición corporal",
      "Mayor sensibilidad a la fatiga en déficit"
    ]
  },
  "weekly_schedule": {
    "work": {
      "morning": "08:00 - 14:00",
      "afternoon": "15:00 - 18:00"
    },
    "training_window": "18:00 - 22:00",
    "dinner_window": "22:00 - 24:00",
    "sleep_time": "01:00",
    "sports": {
      "friday": "Fútbol 1h30 (alta intensidad)",
      "sunday_optional": "Pádel 1h30"
    }
  },
  "nutrition_habits": {
    "breakfast_time": "10:00",
    "breakfast_current": [
      "Café",
      "2 tostadas pan integral",
      "Pavo en lonchas",
      "Queso"
    ],
    "adjustment_strategy": [
      "Reducir a 1 tostada en algunos días",
      "Aumentar ligeramente proteína del desayuno sin hacerlo pesado",
      "Mantener comida principal fuerte a las 14:00",
      "Priorizar proteína diaria 160-180g",
      "Carbohidratos alrededor del entreno",
      "Evitar déficit excesivo"
    ],
    "protein_target_g_day": "160-180",
    "hydration_focus": true
  },
  "training_structure": {
    "split": {
      "monday": "Empuje fuerte (Pecho + Hombro + Tríceps)",
      "tuesday": "Tracción (Espalda + Bíceps)",
      "wednesday": "Pierna completa",
      "thursday": "Estímulo ligero / bomba",
      "friday": "Fútbol",
      "sunday_optional": "Pádel"
    }
  },
  "monday_targets": {
    "press_banca": {
      "sets": 3,
      "weights_kg": [55, 60, 65],
      "rep_scheme": ["8", "6-8", "5-6"]
    },
    "press_inclinado_mancuernas": {
      "weight_kg": 17.5,
      "sets": 3,
      "reps": "8-10"
    },
    "fondos": {
      "load": "Peso corporal + 2.5-5 kg",
      "sets": 3,
      "reps": "6-10"
    },
    "press_militar": {
      "weight_kg": 45,
      "sets": 3,
      "reps": "6-8"
    }
  },
  "tuesday_targets": {
    "jalon": {
      "weights_kg": [75, 80, 80],
      "rep_scheme": ["10", "8-10", "6-8"]
    },
    "remo_multipower": {
      "weight_kg": 50,
      "sets": 3,
      "reps": "8-10"
    },
    "curl_ez": {
      "weight_kg": 30,
      "rep_scheme": ["8", "8", "6"]
    }
  },
  "wednesday_targets": {
    "sentadilla": {
      "weights_kg": [70, 80, 82.5],
      "rep_scheme": ["8", "6-8", "6"]
    },
    "zancadas": {
      "weight_kg_each_hand": 17.5,
      "sets": 2,
      "reps": "10-12"
    },
    "peso_muerto_rumano": {
      "weight_kg_range": "60-70",
      "sets": 3,
      "reps": "8-10"
    }
  },
  "cardio_strategy": {
    "preferred": "Boxeo técnico ligero",
    "avoid_post_leg": "HIIT intenso o comba explosiva",
    "weekly_structure": {
      "monday": "Boxeo 10-15 min opcional",
      "tuesday": "Cinta 15-20 min",
      "wednesday": "10-15 min suave o descanso",
      "friday": "Fútbol (cardio principal)"
    }
  },
  "fatigue_observations": {
    "accumulated_fatigue": true,
    "hip_thrust_difficulty": "Montaje incómodo en gimnasio en casa",
    "cardio_limitation_day3": "Fatiga en piernas y hombros",
    "mental_factor": "Aburrimiento con cinta/bici"
  },
  "optimization_principles": [
    "Reducir volumen innecesario",
    "Priorizar tensión mecánica",
    "Evitar fallo absoluto en déficit",
    "Más repeticiones antes que subir peso",
    "Minimizar fricción logística (menos cambios de mancuernas)",
    "Mantener sostenibilidad semanal"
  ],
  "recovery_focus": {
    "sleep_target_hours": 7,
    "daily_steps_target": "8000-10000",
    "avoid_chronic_fatigue": true
  },
  "overall_status": {
    "discipline_level": "Alto",
    "training_quality": "Buena técnica y progresión sólida",
    "main_risk": "Acumulación de fatiga + volumen excesivo",
    "current_phase": "Afinado para recomposición corporal"
  }
};

export default function AICoach({ workoutLogs, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('groq');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiKey();
    addWelcomeMessage();
  }, []);

  const loadApiKey = async () => {
    const settings = await getSettings();
    if (settings.aiApiKey) {
      setApiKey(settings.aiApiKey);
      setHasApiKey(true);
    }
    if (settings.aiProvider) {
      setAiProvider(settings.aiProvider);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Por favor ingresa una API key válida');
      return;
    }

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
      content: `¡Hola Rubén! 💪 Hoy es **${todayInfo.dayName} ${new Date().getDate()} de ${new Date().toLocaleDateString('es-ES', {month: 'long'})}**.

Soy tu coach de IA personalizado. Tengo acceso completo a:

• Tu perfil, objetivos y contexto médico (Mounjaro)
• Tus targets de peso para cada ejercicio
• Tu progreso histórico
• Tus sensaciones y estado actual
• Tu rutina semanal completa

¿En qué puedo ayudarte? Pregúntame lo que necesites sobre tu entrenamiento, nutrición o progreso.`,
      timestamp: new Date()
    }]);
  };

  const resetConversation = () => {
    if (confirm('¿Reiniciar conversación? Se perderá el historial actual.')) {
      addWelcomeMessage();
    }
  };

  const buildCompleteContext = async () => {
    const todayInfo = getTodayFullInfo();
    const feelings = await getDailyFeelings();
    const metadata = await getWorkoutMetadata();
    const exercises = getAllExercises(workoutLogs);
    
    // Entrenamiento de HOY
    const todayWorkout = workoutLogs[todayInfo.dateKey];
    const todayHasWorkout = todayWorkout && Object.keys(todayWorkout).length > 0;
    
    const recentWorkouts = Object.entries(workoutLogs)
      .sort(([dateA], [dateB]) => new Date(dateB + 'T12:00:00') - new Date(dateA + 'T12:00:00'))
      .slice(0, 7);

    const exerciseFreq = {};
    Object.values(workoutLogs).forEach(day => {
      Object.keys(day).forEach(ex => {
        exerciseFreq[ex] = (exerciseFreq[ex] || 0) + 1;
      });
    });
    const topExercises = Object.entries(exerciseFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ex]) => ex);

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
      .sort(([dateA], [dateB]) => new Date(dateB + 'T12:00:00') - new Date(dateA + 'T12:00:00'))
      .slice(0, 5);

    // Construir contexto completo con PERFIL PERSISTENTE
    return `=== PERFIL COMPLETO DE RUBÉN (CONTEXTO PERMANENTE) ===
${JSON.stringify(RUBEN_PROFILE, null, 2)}

=== FECHA Y ESTADO ACTUAL ===
FECHA ACTUAL: ${todayInfo.fullDate}
DÍA DE LA SEMANA: ${todayInfo.dayName}
FECHA KEY: ${todayInfo.dateKey}

=== ENTRENAMIENTO DE HOY ===
${todayHasWorkout ? `
REGISTRADO (${todayInfo.dateKey}):
${Object.entries(todayWorkout).map(([ex, sets]) => {
  const setDetails = Object.entries(sets).map(([num, data]) => 
    `  Serie ${num}: ${data.weight}kg × ${data.reps} reps`
  ).join('\n');
  return `${ex}:\n${setDetails}`;
}).join('\n\n')}
` : `NO HAY ENTRENAMIENTO REGISTRADO HOY (${todayInfo.dateKey})`}

=== ENTRENAMIENTOS RECIENTES (últimas ${recentWorkouts.length} sesiones) ===
${recentWorkouts.map(([date, ex]) => {
  const meta = metadata[date];
  const exerciseList = Object.keys(ex).slice(0, 5).join(', ');
  const more = Object.keys(ex).length > 5 ? ` +${Object.keys(ex).length - 5} más` : '';
  return `${date} (${meta?.title || 'Entrenamiento'}): ${exerciseList}${more}
  Duración: ${meta?.duration || 'N/A'} | Volumen: ${meta?.volume || 'N/A'}`;
}).join('\n')}

=== PROGRESIÓN DETALLADA (top ${Object.keys(progressions).length} ejercicios) ===
${Object.entries(progressions).map(([ex, d]) => `
${ex}:
  - Peso inicial: ${d.startWeight}kg
  - Peso actual: ${d.currentWeight}kg
  - Progreso total: +${d.progress}kg en ${d.sessions} sesiones
  - 1RM estimado actual: ${d.current1RM.toFixed(1)}kg
  - Última sesión: ${d.lastDate}`).join('\n')}

=== SENSACIONES RECIENTES ===
${recentFeelings.length > 0 ? recentFeelings.map(([date, f]) => 
  `${date}: Energía ${f.energy}/10, Sueño ${f.sleep}/10, Motivación ${f.motivation}/10`
).join('\n') : 'No hay sensaciones registradas'}

=== ESTADÍSTICAS GLOBALES ===
Total entrenamientos registrados: ${Object.keys(workoutLogs).filter(d => Object.keys(workoutLogs[d]).length > 0).length}
Total ejercicios únicos: ${exercises.length}
Ejercicios más frecuentes: ${topExercises.slice(0, 5).join(', ')}

=== IMPORTANTE ===
- SIEMPRE usa este perfil completo para tus recomendaciones
- Considera el contexto médico (Mounjaro) en todas tus respuestas
- Respeta los targets de peso específicos para cada ejercicio
- Ten en cuenta el objetivo principal: recomposición corporal
- Recuerda las limitaciones de fatiga y los principios de optimización
`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !hasApiKey) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      const context = await buildCompleteContext();
      let aiText = '';

      if (aiProvider === 'groq') {
        // ENVIAR TODO EL HISTORIAL DE CONVERSACIÓN + CONTEXTO
        aiText = await callGroqAPI(context, messages, inputMessage);
      }

      const assistantMessage = {
        role: 'assistant',
        content: aiText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const callGroqAPI = async (context, conversationHistory, newMessage) => {
    try {
      // Construir el historial completo de mensajes para la API
      const apiMessages = [
        {
          role: "system",
          content: `Eres el entrenador personal de Rubén. Eres experto, directo, práctico y motivador.

CONTEXTO COMPLETO (USA ESTO EN TODAS TUS RESPUESTAS):
${context}

INSTRUCCIONES:
- Sé específico y usa datos del perfil y progreso de Rubén
- Menciona pesos, ejercicios y sensaciones específicas cuando sea relevante
- Considera SIEMPRE el contexto médico (Mounjaro) y objetivo de recomposición
- Usa emojis ocasionalmente para mantener el tono motivador
- Si no tienes datos suficientes, recomienda registrar más info
- Sé conciso pero completo en tus respuestas`
        }
      ];

      // Añadir TODA la conversación previa (excluyendo el mensaje de bienvenida)
      const conversationMessages = conversationHistory
        .slice(1) // Saltar mensaje de bienvenida
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      apiMessages.push(...conversationMessages);

      // Añadir el nuevo mensaje del usuario
      apiMessages.push({
        role: "user",
        content: newMessage
      });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('Respuesta inválida de la API');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error(`${error.message}`);
    }
  };

  const quickPrompts = [
    "Analiza mi progreso general",
    "¿Debo subir peso en press banca?",
    "¿Cómo llevo la sentadilla?",
    "Consejos para mi nutrición",
    "¿Estoy progresando bien?"
  ];

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button 
          onClick={() => {
            setShowSettings(false);
            setError('');
          }} 
          className="mb-6 text-blue-400 hover:text-blue-300"
        >
          ← Volver
        </button>

        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl mb-6">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Settings className="w-7 h-7" />
              Configurar IA Gratuita
            </h1>
            <p className="text-purple-100 text-sm">Groq (Llama 3.3) - 100% gratis con memoria</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-slate-800 rounded-2xl p-6 mb-4">
            <h3 className="font-bold mb-4">Groq (Recomendado)</h3>
            
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-green-300">
                ✅ 100% GRATIS sin límites<br/>
                ⚡ Ultra rápido (2-3s)<br/>
                🧠 Llama 3.3 70B<br/>
                💾 Memoria de conversación<br/>
                🎯 Contexto completo de tu perfil<br/>
                ❌ Sin tarjeta de crédito
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                API Key de Groq:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                }}
                placeholder="gsk_..."
                className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold mb-2">⚡ Cómo conseguir API key:</p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-300">
                <li>Ve a <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">console.groq.com</a></li>
                <li>Crea cuenta con Google</li>
                <li>Click en "API Keys"</li>
                <li>Click "Create API Key"</li>
                <li>Copia la key (gsk_...)</li>
                <li>Pégala aquí</li>
              </ol>
            </div>

            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className={`w-full font-semibold py-3 rounded-xl transition-all ${
                apiKey.trim()
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  : 'bg-slate-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {apiKey.trim() ? '✅ Guardar y activar' : 'Ingresa una API key'}
            </button>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/50 rounded-xl p-4 text-sm">
            <p className="font-semibold mb-2 text-purple-300">🎯 Tu Coach Personalizado:</p>
            <ul className="space-y-1 text-gray-300 ml-4 list-disc">
              <li>Tiene acceso a tu perfil completo (edad, altura, objetivos)</li>
              <li>Conoce tu contexto médico (Mounjaro)</li>
              <li>Sabe tus targets de peso para cada ejercicio</li>
              <li>Analiza tu progreso histórico completo</li>
              <li>Mantiene memoria de toda la conversación</li>
              <li>Se reinicia solo cuando cierras y vuelves a abrir el chat</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between shadow-lg">
        <button onClick={onClose} className="text-purple-100 hover:text-white">
          ← Volver
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Coach IA
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Groq ⚡</span>
        </h1>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button 
              onClick={resetConversation}
              className="text-purple-100 hover:text-white"
              title="Reiniciar conversación"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(true)}
            className="text-purple-100 hover:text-white"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {!hasApiKey ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-xl font-bold mb-2">Activa tu Coach IA Personalizado</h2>
            <p className="text-gray-400 mb-4">
              Usa <strong className="text-green-400">Groq</strong> (Llama 3.3) completamente gratis
            </p>
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-6 text-sm text-left">
              <p className="font-semibold mb-2 text-blue-300">🎯 Tu coach tendrá:</p>
              <ul className="space-y-1 text-gray-300 ml-4 list-disc">
                <li>Tu perfil completo y objetivos</li>
                <li>Contexto médico (Mounjaro)</li>
                <li>Targets de peso para cada ejercicio</li>
                <li>Historial de progreso completo</li>
                <li>Memoria de conversación persistente</li>
              </ul>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
            >
              Configurar ahora (2 min)
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-gray-100'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-purple-400 font-semibold">Coach IA</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
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
          </div>

          {messages.length === 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(prompt)}
                    className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-900 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Pregúntame lo que quieras..."
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
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
                💾 Memoria activa - La IA recuerda toda la conversación
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}