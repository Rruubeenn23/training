import React, { useState, useEffect } from 'react';
import { Brain, Settings, Sparkles, MessageCircle, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, getDailyFeelings, getWorkoutMetadata } from '../utils/storageHelper';
import { getAllExercises, getExerciseHistory } from '../utils/storageHelper';

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
    setMessages([{
      role: 'assistant',
      content: '¡Hola Rubén! 💪 Soy tu coach de IA. Puedo ayudarte con:\n\n• Analizar tu progreso\n• Dar recomendaciones de entrenamiento\n• Ajustar volumen e intensidad\n• Responder dudas sobre ejercicios\n\n¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }]);
  };

  const buildContext = async () => {
    const feelings = await getDailyFeelings();
    const metadata = await getWorkoutMetadata();
    const exercises = getAllExercises(workoutLogs);
    
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

    return `Contexto del cliente Rubén:

Objetivo: Recomposición corporal (definición + mantener músculo)

Rutina:
- Lunes: Empuje (Pecho/Hombro/Tríceps) - Alta
- Martes: Tracción (Espalda/Bíceps) - Media-Alta
- Miércoles: Pierna - Media
- Jueves: Bomba/Recuperación - Baja
- Viernes: Fútbol
- Domingo: Pádel

Últimos entrenamientos: ${recentWorkouts.length}
${recentWorkouts.slice(0, 2).map(([date, ex]) => `- ${date}: ${Object.keys(ex).length} ejercicios`).join('\n')}

${Object.keys(progressions).length > 0 ? `\nProgresión top ejercicios:\n${Object.entries(progressions).slice(0, 3).map(([ex, d]) => `- ${ex}: ${d.startWeight}→${d.currentWeight}kg (+${d.progress}kg)`).join('\n')}` : ''}

${recentFeelings.length > 0 ? `\nÚltimo estado:\nEnergía: ${recentFeelings[0][1].energy}/10, Sueño: ${recentFeelings[0][1].sleep}/10, Motivación: ${recentFeelings[0][1].motivation}/10` : ''}`;
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
      } else if (aiProvider === 'openrouter') {
        aiText = await callOpenRouterAPI(context, inputMessage);
      } else if (aiProvider === 'huggingface') {
        aiText = await callHuggingFaceAPI(context, inputMessage);
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
        content: `❌ Error: ${error.message}\n\nVerifica:\n• Tu API key es correcta\n• Tienes conexión a internet\n• No has excedido el límite de peticiones`,
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
        console.error('Groq API error:', errorData);
        
        if (response.status === 401) {
          throw new Error('API key inválida. Verifica tu key de Groq.');
        } else if (response.status === 429) {
          throw new Error('Límite de peticiones alcanzado. Espera un momento.');
        } else {
          throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
        }
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Respuesta inválida de Groq');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error(`Groq: ${error.message}`);
    }
  };

  const callOpenRouterAPI = async (context, message) => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Training Tracker"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: [
            {
              role: "system",
              content: `Entrenador personal experto. ${context}`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error(`OpenRouter: ${error.message}`);
    }
  };

  const callHuggingFaceAPI = async (context, message) => {
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          inputs: `${context}\n\nUsuario: ${message}\nAsistente:`,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data[0].generated_text.split('Asistente:')[1]?.trim() || data[0].generated_text;
    } catch (error) {
      throw new Error(`HuggingFace: ${error.message}`);
    }
  };

  const quickPrompts = [
    "Analiza mi progreso general",
    "¿Debería aumentar peso?",
    "¿Cómo va mi sentadilla?",
    "Dame tips para mejorar"
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
            <p className="text-purple-100 text-sm">Usa Groq (Llama 3.3) completamente gratis</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          {/* Provider selector */}
          <div className="bg-slate-800 rounded-2xl p-6 mb-4">
            <h3 className="font-bold mb-4">Proveedor de IA</h3>
            
            <div className="space-y-3 mb-4">
              <button
                onClick={() => setAiProvider('groq')}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  aiProvider === 'groq' 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 ring-2 ring-green-400' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Groq (Recomendado)
                  </div>
                  {aiProvider === 'groq' && <span className="text-xs bg-white/20 px-2 py-1 rounded">✓</span>}
                </div>
                <p className="text-sm text-gray-300">
                  ✅ 100% GRATIS sin límites<br/>
                  ⚡ Ultra rápido (2-3s)<br/>
                  🧠 Llama 3.3 70B<br/>
                  ❌ Sin tarjeta de crédito
                </p>
              </button>

              <button
                onClick={() => setAiProvider('openrouter')}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  aiProvider === 'openrouter' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800 ring-2 ring-blue-400' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">OpenRouter</div>
                  {aiProvider === 'openrouter' && <span className="text-xs bg-white/20 px-2 py-1 rounded">✓</span>}
                </div>
                <p className="text-sm text-gray-300">
                  ✅ Modelos gratis disponibles<br/>
                  ⚠️ Más lento que Groq
                </p>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                {aiProvider === 'groq' ? 'API Key de Groq' : 'API Key de OpenRouter'}:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                }}
                placeholder={aiProvider === 'groq' ? 'gsk_...' : 'sk-or-...'}
                className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold mb-2">
                {aiProvider === 'groq' ? '⚡ Cómo conseguir API key de Groq:' : '🔑 Cómo conseguir API key:'}
              </p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-300">
                {aiProvider === 'groq' && (
                  <>
                    <li>Ve a <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">console.groq.com</a></li>
                    <li>Crea cuenta con Google o email</li>
                    <li>Click en "API Keys" en el menú</li>
                    <li>Click "Create API Key"</li>
                    <li>Dale un nombre y crea</li>
                    <li>Copia la key (empieza con gsk_...)</li>
                    <li>Pégala aquí arriba</li>
                  </>
                )}
                {aiProvider === 'openrouter' && (
                  <>
                    <li>Ve a <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">openrouter.ai/keys</a></li>
                    <li>Crea cuenta</li>
                    <li>Crea nueva key</li>
                    <li>Cópiala y pégala aquí</li>
                  </>
                )}
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

          {aiProvider === 'groq' && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 text-sm">
              <p className="font-semibold mb-2 text-green-400">💡 Groq es la mejor opción:</p>
              <ul className="space-y-1 text-gray-300 ml-4 list-disc">
                <li>Completamente gratis, sin límites ocultos</li>
                <li>No pide tarjeta de crédito nunca</li>
                <li>Llama 3.3 70B (muy inteligente)</li>
                <li>Responde en 2-3 segundos</li>
                <li>Perfect para entrenamiento personal</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between shadow-lg">
        <button onClick={onClose} className="text-purple-100 hover:text-white">
          ← Volver
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Coach IA
          {aiProvider === 'groq' && <span className="text-xs bg-white/20 px-2 py-1 rounded">Groq ⚡</span>}
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
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 mb-6 text-sm text-left">
              <p className="font-semibold mb-2 text-green-400">✨ Sin costo oculto:</p>
              <ul className="space-y-1 text-gray-300 ml-4 list-disc">
                <li>100% gratis sin límites</li>
                <li>No pide tarjeta de crédito</li>
                <li>Setup en 2 minutos</li>
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
          {/* Messages */}
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

          {/* Quick prompts */}
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

          {/* Input */}
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