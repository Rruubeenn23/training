import React, { useState, useEffect } from 'react';
import { Brain, Settings, Sparkles, MessageCircle, Zap, AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, getDailyFeelings, getWorkoutMetadata } from '../utils/storageHelper';
import { getAllExercises, getExerciseHistory } from '../utils/storageHelper';
import { getTodayFullInfo, getTodayDateKey } from '../utils/dateUtils';

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

Soy tu coach de IA. Puedo ayudarte con:

• Analizar tu progreso
• Dar recomendaciones
• Ajustar volumen e intensidad
• Responder dudas sobre ejercicios

¿En qué puedo ayudarte?`,
      timestamp: new Date()
    }]);
  };

  const buildContext = async () => {
    const todayInfo = getTodayFullInfo();
    const feelings = await getDailyFeelings();
    const metadata = await getWorkoutMetadata();
    const exercises = getAllExercises(workoutLogs);
    
    // Entrenamiento de HOY
    const todayWorkout = workoutLogs[todayInfo.dateKey];
    const todayHasWorkout = todayWorkout && Object.keys(todayWorkout).length > 0;
    
    const recentWorkouts = Object.entries(workoutLogs)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .slice(0, 5);

    const exerciseFreq = {};
    Object.values(workoutLogs).forEach(day => {
      Object.keys(day).forEach(ex => {
        exerciseFreq[ex] = (exerciseFreq[ex] || 0) + 1;
      });
    });
    const topExercises = Object.entries(exerciseFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
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
          current1RM: last.estimated1RM
        };
      }
    });

    const recentFeelings = Object.entries(feelings)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .slice(0, 3);

    return `FECHA ACTUAL: ${todayInfo.fullDate}
DÍA DE LA SEMANA: ${todayInfo.dayName}
FECHA KEY: ${todayInfo.dateKey}

${todayHasWorkout ? `
ENTRENAMIENTO DE HOY (${todayInfo.dateKey}):
${Object.entries(todayWorkout).map(([ex, sets]) => `- ${ex}: ${Object.keys(sets).length} series`).join('\n')}
` : `
NO HAY ENTRENAMIENTO REGISTRADO HOY (${todayInfo.dateKey})
`}

Objetivo: Recomposición corporal (definición + mantener músculo)

Rutina semanal:
- Lunes: Empuje (Pecho/Hombro/Tríceps) - Alta
- Martes: Tracción (Espalda/Bíceps) - Media-Alta
- Miércoles: Pierna - Media
- Jueves: Bomba/Recuperación - Baja
- Viernes: Fútbol
- Domingo: Pádel

${recentWorkouts.length > 0 ? `
Últimos entrenamientos:
${recentWorkouts.slice(0, 3).map(([date, ex]) => `- ${date}: ${Object.keys(ex).length} ejercicios`).join('\n')}
` : ''}

${Object.keys(progressions).length > 0 ? `
Progresión ejercicios principales:
${Object.entries(progressions).slice(0, 3).map(([ex, d]) => `- ${ex}: ${d.startWeight}→${d.currentWeight}kg (+${d.progress}kg en ${d.sessions} sesiones)`).join('\n')}
` : ''}

${recentFeelings.length > 0 ? `
Estado reciente:
${recentFeelings.slice(0, 1).map(([date, f]) => `- ${date}: Energía ${f.energy}/10, Sueño ${f.sleep}/10, Motivación ${f.motivation}/10`).join('\n')}
` : ''}

Total entrenamientos: ${Object.keys(workoutLogs).filter(d => Object.keys(workoutLogs[d]).length > 0).length}`;
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
      const context = await buildContext();
      let aiText = '';

      if (aiProvider === 'groq') {
        aiText = await callGroqAPI(context, inputMessage);
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

  const callGroqAPI = async (context, message) => {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Eres un entrenador personal experto. Sé directo, práctico y motivador. Usa emojis ocasionalmente.

${context}`
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('API key inválida. Verifica tu key de Groq.');
        } else if (response.status === 429) {
          throw new Error('Límite alcanzado. Espera un momento.');
        } else {
          throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
        }
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Respuesta inválida');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error(`${error.message}`);
    }
  };

  const quickPrompts = [
    "¿Analiza mi progreso?",
    "¿Debería subir peso?",
    "¿Cómo va mi sentadilla?",
    "Dame un consejo"
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
            <p className="text-purple-100 text-sm">Groq (Llama 3.3) - 100% gratis</p>
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
        <button 
          onClick={() => setShowSettings(true)}
          className="text-purple-100 hover:text-white"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {!hasApiKey ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-xl font-bold mb-2">Activa tu Coach IA</h2>
            <p className="text-gray-400 mb-6">
              Usa <strong className="text-green-400">Groq</strong> (Llama 3.3) completamente gratis
            </p>
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
                    <span className="text-sm text-gray-400">Pensando...</span>
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
          </div>
        </>
      )}
    </div>
  );
}