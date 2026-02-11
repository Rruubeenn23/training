import React, { useState, useEffect } from 'react';
import { Brain, Settings, Sparkles, MessageCircle, TrendingUp } from 'lucide-react';
import { getSettings, saveSettings, getDailyFeelings, getWorkoutMetadata } from '../utils/storageHelper';
import { getAllExercises, getExerciseHistory } from '../utils/storageHelper';

export default function AICoach({ workoutLogs, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    loadApiKey();
    addWelcomeMessage();
  }, []);

  const loadApiKey = async () => {
    const settings = await getSettings();
    if (settings.apiKey) {
      setApiKey(settings.apiKey);
      setHasApiKey(true);
    }
  };

  const saveApiKey = async () => {
    const settings = await getSettings();
    settings.apiKey = apiKey;
    await saveSettings(settings);
    setHasApiKey(true);
    setShowSettings(false);
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
    
    // Get recent workouts
    const recentWorkouts = Object.entries(workoutLogs)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .slice(0, 5);

    // Get top exercises by frequency
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

    // Get progression data for top exercises
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

    // Recent feelings
    const recentFeelings = Object.entries(feelings)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .slice(0, 3);

    const context = `
CONTEXTO DE ENTRENAMIENTO DE RUBÉN:

Objetivo: Recomposición corporal (pérdida de grasa + mantener/ganar músculo)

Rutina semanal:
- Lunes: Empuje Fuerte (Pecho + Hombro + Tríceps) - Alta intensidad
- Martes: Tracción (Espalda + Bíceps) - Medio-Alto
- Miércoles: Pierna Completa - Media
- Jueves: Bomba/Recuperación - Media-Baja
- Viernes: Fútbol (1h30) - Alta
- Domingo: Pádel (opcional) - Media

Datos recientes:
${recentWorkouts.length > 0 ? `
Últimos entrenamientos:
${recentWorkouts.map(([date, exercises]) => `
- ${date}: ${Object.keys(exercises).length} ejercicios
  ${metadata[date] ? `Duración: ${metadata[date].duration}, Volumen: ${metadata[date].volume}` : ''}
`).join('')}
` : 'No hay entrenamientos recientes'}

${Object.keys(progressions).length > 0 ? `
Progresión en ejercicios principales:
${Object.entries(progressions).map(([ex, data]) => `
- ${ex}: ${data.startWeight}kg → ${data.currentWeight}kg (${data.progress > 0 ? '+' : ''}${data.progress}kg en ${data.sessions} sesiones)
  1RM estimado: ${Math.round(data.current1RM)}kg
`).join('')}
` : ''}

${recentFeelings.length > 0 ? `
Estado reciente:
${recentFeelings.map(([date, feeling]) => `
- ${date}: Energía ${feeling.energy}/10, Sueño ${feeling.sleep}/10, Motivación ${feeling.motivation}/10
`).join('')}
` : ''}

Total de entrenamientos registrados: ${Object.keys(workoutLogs).length}
Ejercicios únicos realizados: ${exercises.length}
`;

    return context;
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

    try {
      const context = await buildContext();
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: `Eres un entrenador personal experto en recomposición corporal, especializado en programación de entrenamiento de fuerza y análisis de progreso. 

Tu cliente es Rubén, que sigue una rutina de Push/Pull/Legs con el objetivo de recomposición corporal (definición + mantenimiento/ganancia muscular).

INSTRUCCIONES:
- Sé directo, práctico y motivador
- Basa tus recomendaciones en los datos reales de progreso
- Si recomiendas cambios, explica el por qué
- Usa emojis ocasionalmente para ser más cercano
- Si no hay suficientes datos, sé honesto y pide más información
- Considera el contexto de recomposición corporal (déficit calórico)
- Ten en cuenta el volumen semanal total y la recuperación

${context}`,
          messages: [
            {
              role: "user",
              content: inputMessage
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Error en la API de Anthropic');
      }

      const data = await response.json();
      const aiText = data.content.find(c => c.type === 'text')?.text || 'No pude generar una respuesta.';

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
        content: '❌ Error al conectar con la IA. Verifica tu API key y conexión.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const quickPrompts = [
    "Analiza mi progreso general",
    "¿Debería aumentar el volumen?",
    "¿Cómo va mi sentadilla?",
    "Dame tips para el press banca"
  ];

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button 
          onClick={() => setShowSettings(false)} 
          className="mb-6 text-blue-400 hover:text-blue-300"
        >
          ← Volver
        </button>

        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-2xl mb-6">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Settings className="w-7 h-7" />
              Configurar IA
            </h1>
            <p className="text-purple-100 text-sm">Necesitas una API key de Anthropic</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6">
            <h3 className="font-bold mb-4">API Key de Anthropic</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Tu API Key:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api..."
                className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold mb-2">¿Cómo conseguir tu API key?</p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-300">
                <li>Ve a <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">console.anthropic.com</a></li>
                <li>Crea una cuenta o inicia sesión</li>
                <li>Ve a "API Keys" y crea una nueva</li>
                <li>Cópiala y pégala aquí</li>
              </ol>
            </div>

            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className={`w-full font-semibold py-3 rounded-xl transition-all ${
                apiKey.trim()
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                  : 'bg-slate-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Guardar API Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
        <button onClick={onClose} className="text-purple-100 hover:text-white">
          ← Volver
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Coach IA
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
            <h2 className="text-xl font-bold mb-2">Configura tu Coach IA</h2>
            <p className="text-gray-400 mb-6">
              Necesitas una API key de Anthropic para usar esta función
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl"
            >
              Configurar ahora
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
                  className={`max-w-[80%] rounded-2xl p-4 ${
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
                <div className="bg-slate-800 rounded-2xl p-4">
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
          <div className="p-4 bg-slate-900">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Pregúntame cualquier cosa..."
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
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