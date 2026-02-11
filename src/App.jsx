import React, { useState, useEffect } from 'react';
import { Calendar, Dumbbell, TrendingUp, Brain, Target, Plus, ChevronRight, Activity, Moon, Zap, CheckCircle } from 'lucide-react';

// Configuración de la rutina semanal
const WEEKLY_PLAN = {
  lunes: {
    name: "Empuje Fuerte",
    emoji: "🔵",
    muscle: "Pecho + Hombro + Tríceps",
    intensity: "Alta",
    exercises: [
      { name: "Press banca", weight: "55/60/65 kg", reps: "8/6-8/5-6" },
      { name: "Press inclinado mancuernas", weight: "17.5 kg", reps: "3×8-10" },
      { name: "Cruces polea", weight: "10-12 kg", reps: "2×12-15" },
      { name: "Press militar", weight: "45 kg", reps: "3×6-8" },
      { name: "Fondos", weight: "PC + 2.5-5 kg", reps: "3×6-10" },
      { name: "Extensión polea", weight: "32-35 kg", reps: "2×10-12" },
      { name: "Extensión overhead", weight: "22-25 kg", reps: "2×12-15" }
    ]
  },
  martes: {
    name: "Tracción",
    emoji: "🟢",
    muscle: "Espalda + Bíceps",
    intensity: "Medio-Alto",
    exercises: [
      { name: "Jalón", weight: "75/80/80 kg", reps: "10/8-10/6-8" },
      { name: "Remo multipower", weight: "50 kg", reps: "3×8-10" },
      { name: "Remo polea", weight: "60 kg", reps: "2×10-12" },
      { name: "Remo unilateral polea", weight: "Medio-alto", reps: "2×10-12" },
      { name: "Pull-over", weight: "35 kg", reps: "2×12-15" },
      { name: "Curl EZ", weight: "30 kg", reps: "3×8-8-6" },
      { name: "Curl polea/martillo", weight: "Medio", reps: "2×10-12" },
      { name: "Curl polea baja", weight: "25 kg", reps: "2×12-15" }
    ]
  },
  miercoles: {
    name: "Pierna Completa",
    emoji: "🟡",
    muscle: "Cuádriceps + Femoral + Gemelos",
    intensity: "Media",
    exercises: [
      { name: "Sentadilla", weight: "70/80/82.5 kg", reps: "8/6-8/6" },
      { name: "Zancadas", weight: "17.5 kg", reps: "2×10-12" },
      { name: "Sentadilla pies adelantados", weight: "Medio", reps: "2×10-12" },
      { name: "Peso muerto rumano", weight: "60-70 kg", reps: "3×8-10" },
      { name: "Curl femoral", weight: "Medio", reps: "2×12-15" },
      { name: "Gemelos", weight: "Medio-alto", reps: "3×15-20" }
    ]
  },
  jueves: {
    name: "Bomba / Recuperación",
    emoji: "🟣",
    muscle: "Volumen ligero",
    intensity: "Media-Baja",
    exercises: [
      { name: "Elevaciones laterales", reps: "3×12-15" },
      { name: "Pájaros", reps: "3×12-15" },
      { name: "Press militar ligero", reps: "2×8-10" },
      { name: "Press inclinado multipower", reps: "2×8-10" },
      { name: "Aperturas inclinadas", reps: "2×12-15" },
      { name: "Curl polea", reps: "2×12-15" },
      { name: "Extensión polea", reps: "2×12-15" },
      { name: "Fondos banco", reps: "2×12-15" }
    ]
  },
  viernes: {
    name: "Fútbol",
    emoji: "🔴",
    muscle: "HIIT Natural",
    intensity: "Alta",
    exercises: []
  },
  sabado: {
    name: "Descanso",
    emoji: "🟤",
    muscle: "Recuperación activa",
    intensity: "Baja",
    exercises: []
  },
  domingo: {
    name: "Pádel (Opcional)",
    emoji: "⚪",
    muscle: "Aeróbico intermitente",
    intensity: "Media",
    exercises: []
  }
};

const DAYS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAYS_NAMES = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
};

export default function App() {
  const [view, setView] = useState('home');
  const [selectedDay, setSelectedDay] = useState(null);
  const [workoutLog, setWorkoutLog] = useState({});
  const [todayFeeling, setTodayFeeling] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Cargar datos del almacenamiento
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const logs = await window.storage.get('workout-logs');
      const feeling = await window.storage.get('today-feeling');
      
      if (logs?.value) {
        setWorkoutLog(JSON.parse(logs.value));
      }
      if (feeling?.value) {
        setTodayFeeling(JSON.parse(feeling.value));
      }
    } catch (error) {
      console.log('Primera carga, sin datos previos');
    }
  };

  const saveWorkoutLog = async (newLog) => {
    setWorkoutLog(newLog);
    await window.storage.set('workout-logs', JSON.stringify(newLog));
  };

  const saveTodayFeeling = async (feeling) => {
    setTodayFeeling(feeling);
    await window.storage.set('today-feeling', JSON.stringify(feeling));
  };

  const getCurrentDayKey = () => {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[new Date().getDay()];
  };

  const getTodayWorkout = () => {
    const dayKey = getCurrentDayKey();
    return WEEKLY_PLAN[dayKey];
  };

  const getAIRecommendation = async (context) => {
    setAiLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Eres un entrenador personal experto en recomposición corporal. Analiza estos datos del entrenamiento de Rubén y dame recomendaciones breves y prácticas:

Contexto:
${context}

Datos de hoy:
${todayFeeling ? `Energía: ${todayFeeling.energy}/10, Sueño: ${todayFeeling.sleep}/10, Motivación: ${todayFeeling.motivation}/10` : 'No registrado'}

Dame 3-4 recomendaciones concretas y motivadoras en español. Sé directo y práctico.`
            }
          ],
        })
      });

      const data = await response.json();
      const aiText = data.content.find(c => c.type === 'text')?.text || 'No pude generar recomendaciones.';
      setAiResponse(aiText);
    } catch (error) {
      setAiResponse('Error al conectar con la IA. Intenta de nuevo.');
    }
    setAiLoading(false);
  };

  // Vista Home
  const HomeView = () => {
    const todayWorkout = getTodayWorkout();
    const dayKey = getCurrentDayKey();
    const todayLogs = workoutLog[new Date().toISOString().split('T')[0]] || {};

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">💪 Training Tracker</h1>
          <p className="text-blue-100">Hola Rubén, ¡vamos a machacar!</p>
        </div>

        {/* Today's Feeling */}
        {!todayFeeling && (
          <div className="mx-4 mt-6 bg-yellow-500/20 border-2 border-yellow-500 rounded-2xl p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              ¿Cómo te sientes hoy?
            </h3>
            <button 
              onClick={() => setView('feeling')}
              className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-semibold hover:bg-yellow-400 transition-all"
            >
              Registrar sensaciones
            </button>
          </div>
        )}

        {todayFeeling && (
          <div className="mx-4 mt-6 bg-green-500/20 border-2 border-green-500 rounded-2xl p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Estado de hoy
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <Zap className="w-6 h-6 mx-auto mb-1 text-yellow-400" />
                <div className="text-2xl font-bold">{todayFeeling.energy}</div>
                <div className="text-xs text-gray-300">Energía</div>
              </div>
              <div>
                <Moon className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                <div className="text-2xl font-bold">{todayFeeling.sleep}</div>
                <div className="text-xs text-gray-300">Sueño</div>
              </div>
              <div>
                <Target className="w-6 h-6 mx-auto mb-1 text-red-400" />
                <div className="text-2xl font-bold">{todayFeeling.motivation}</div>
                <div className="text-xs text-gray-300">Motivación</div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Workout */}
        {todayWorkout && (
          <div className="mx-4 mt-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {todayWorkout.emoji} {DAYS_NAMES[dayKey]}
                </h2>
                <p className="text-blue-200">{todayWorkout.name}</p>
                <p className="text-sm text-gray-300">{todayWorkout.muscle}</p>
              </div>
              <div className="text-right">
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  todayWorkout.intensity === 'Alta' ? 'bg-red-500' :
                  todayWorkout.intensity === 'Medio-Alto' ? 'bg-orange-500' :
                  todayWorkout.intensity === 'Media' ? 'bg-yellow-500' :
                  todayWorkout.intensity === 'Media-Baja' ? 'bg-green-500' :
                  'bg-slate-500'
                }`}>
                  {todayWorkout.intensity}
                </div>
              </div>
            </div>

            {todayWorkout.exercises.length > 0 && (
              <button 
                onClick={() => {
                  setSelectedDay(dayKey);
                  setView('workout');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Dumbbell className="w-5 h-5" />
                {Object.keys(todayLogs).length > 0 ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mx-4 mt-6">
          <button 
            onClick={() => setView('calendar')}
            className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl transition-all"
          >
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <div className="font-semibold">Calendario</div>
            <div className="text-xs text-gray-400">Ver semana</div>
          </button>

          <button 
            onClick={() => setView('progress')}
            className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl transition-all"
          >
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <div className="font-semibold">Progreso</div>
            <div className="text-xs text-gray-400">Ver stats</div>
          </button>
        </div>

        {/* AI Assistant */}
        <div className="mx-4 mt-6 mb-24">
          <button 
            onClick={() => {
              setShowAI(true);
              getAIRecommendation(`Día: ${DAYS_NAMES[dayKey]}, Entrenamiento: ${todayWorkout?.name || 'Descanso'}`);
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-4 rounded-2xl transition-all flex items-center justify-center gap-2 font-semibold"
          >
            <Brain className="w-6 h-6" />
            Consultar a tu Coach IA
          </button>

          {showAI && (
            <div className="mt-4 bg-slate-800 rounded-2xl p-4 border-2 border-purple-500">
              {aiLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-gray-400">Analizando tus datos...</p>
                </div>
              ) : (
                <>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Recomendaciones personalizadas
                  </h3>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {aiResponse}
                  </div>
                  <button 
                    onClick={() => setShowAI(false)}
                    className="mt-4 text-sm text-purple-400 hover:text-purple-300"
                  >
                    Cerrar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Vista de registro de sensaciones
  const FeelingView = () => {
    const [energy, setEnergy] = useState(5);
    const [sleep, setSleep] = useState(5);
    const [motivation, setMotivation] = useState(5);

    const handleSave = () => {
      saveTodayFeeling({ energy, sleep, motivation, date: new Date().toISOString() });
      setView('home');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button onClick={() => setView('home')} className="mb-6 text-blue-400 hover:text-blue-300">
          ← Volver
        </button>

        <h1 className="text-3xl font-bold mb-8">¿Cómo te sientes hoy?</h1>

        <div className="space-y-8">
          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-bold">Energía</h3>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={energy}
              onChange={(e) => setEnergy(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center mt-3 text-3xl font-bold text-yellow-400">{energy}/10</div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Moon className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold">Calidad del sueño</h3>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={sleep}
              onChange={(e) => setSleep(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center mt-3 text-3xl font-bold text-blue-400">{sleep}/10</div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-bold">Motivación</h3>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={motivation}
              onChange={(e) => setMotivation(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center mt-3 text-3xl font-bold text-red-400">{motivation}/10</div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl transition-all"
        >
          Guardar sensaciones
        </button>
      </div>
    );
  };

  // Vista de calendario semanal
  const CalendarView = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button onClick={() => setView('home')} className="mb-6 text-blue-400 hover:text-blue-300">
          ← Volver
        </button>

        <h1 className="text-3xl font-bold mb-6">📅 Semana de entrenamiento</h1>

        <div className="space-y-3">
          {DAYS_ORDER.map(dayKey => {
            const workout = WEEKLY_PLAN[dayKey];
            if (!workout) return null;

            return (
              <button
                key={dayKey}
                onClick={() => {
                  setSelectedDay(dayKey);
                  setView('workout');
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">
                      {workout.emoji} {DAYS_NAMES[dayKey]}
                    </div>
                    <div className="text-sm text-gray-400">{workout.name}</div>
                    <div className="text-xs text-gray-500">{workout.muscle}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    workout.intensity === 'Alta' ? 'bg-red-500' :
                    workout.intensity === 'Medio-Alto' ? 'bg-orange-500' :
                    workout.intensity === 'Media' ? 'bg-yellow-500' :
                    workout.intensity === 'Media-Baja' ? 'bg-green-500' :
                    'bg-slate-500'
                  }`}>
                    {workout.intensity}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Vista de entrenamiento
  const WorkoutView = () => {
    const workout = WEEKLY_PLAN[selectedDay];
    const dateKey = new Date().toISOString().split('T')[0];
    const [localLog, setLocalLog] = useState(workoutLog[dateKey] || {});

    const handleExerciseLog = (exerciseName, setIndex, weight, reps) => {
      const newLog = {
        ...localLog,
        [exerciseName]: {
          ...(localLog[exerciseName] || {}),
          [setIndex]: { weight, reps, timestamp: new Date().toISOString() }
        }
      };
      setLocalLog(newLog);
      
      const newWorkoutLog = {
        ...workoutLog,
        [dateKey]: newLog
      };
      saveWorkoutLog(newWorkoutLog);
    };

    if (!workout) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
        <button onClick={() => setView('home')} className="mb-6 text-blue-400 hover:text-blue-300">
          ← Volver
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {workout.emoji} {DAYS_NAMES[selectedDay]}
          </h1>
          <p className="text-gray-400">{workout.name} - {workout.muscle}</p>
        </div>

        <div className="space-y-4">
          {workout.exercises.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-6 text-center">
              <p className="text-gray-400">Actividad deportiva - ¡Disfruta!</p>
            </div>
          ) : (
            workout.exercises.map((exercise, idx) => (
              <div key={idx} className="bg-slate-800 rounded-2xl p-4">
                <h3 className="font-bold mb-2">{exercise.name}</h3>
                <div className="text-sm text-gray-400 mb-3">
                  {exercise.weight && `Peso: ${exercise.weight}`}
                  {exercise.weight && exercise.reps && ' | '}
                  {exercise.reps && `Reps: ${exercise.reps}`}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(setNum => {
                    const logged = localLog[exercise.name]?.[setNum];
                    return (
                      <button
                        key={setNum}
                        onClick={() => {
                          const weight = prompt('Peso usado (kg):');
                          const reps = prompt('Repeticiones:');
                          if (weight && reps) {
                            handleExerciseLog(exercise.name, setNum, weight, reps);
                          }
                        }}
                        className={`p-2 rounded-xl text-sm ${
                          logged 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-slate-700 hover:bg-slate-600'
                        } transition-all`}
                      >
                        <div className="font-semibold">Serie {setNum}</div>
                        {logged && (
                          <div className="text-xs mt-1">
                            {logged.weight}kg × {logged.reps}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Vista de progreso
  const ProgressView = () => {
    const totalWorkouts = Object.keys(workoutLog).length;
    const exercisesCompleted = Object.values(workoutLog).reduce((acc, day) => {
      return acc + Object.keys(day).length;
    }, 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button onClick={() => setView('home')} className="mb-6 text-blue-400 hover:text-blue-300">
          ← Volver
        </button>

        <h1 className="text-3xl font-bold mb-8">📊 Tu progreso</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold mb-2">{totalWorkouts}</div>
            <div className="text-sm text-blue-200">Entrenamientos</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold mb-2">{exercisesCompleted}</div>
            <div className="text-sm text-purple-200">Ejercicios</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="font-bold mb-4 text-xl">Últimos entrenamientos</h2>
          {Object.entries(workoutLog).reverse().slice(0, 5).map(([date, exercises]) => (
            <div key={date} className="mb-4 pb-4 border-b border-slate-700 last:border-0">
              <div className="font-semibold text-blue-400">{new Date(date).toLocaleDateString('es-ES')}</div>
              <div className="text-sm text-gray-400 mt-1">
                {Object.keys(exercises).length} ejercicios completados
              </div>
            </div>
          ))}
          {totalWorkouts === 0 && (
            <p className="text-gray-500 text-center py-8">¡Empieza a entrenar para ver tu progreso!</p>
          )}
        </div>
      </div>
    );
  };

  // Render según la vista activa
  return (
    <>
      {view === 'home' && <HomeView />}
      {view === 'feeling' && <FeelingView />}
      {view === 'calendar' && <CalendarView />}
      {view === 'workout' && <WorkoutView />}
      {view === 'progress' && <ProgressView />}
    </>
  );
}
