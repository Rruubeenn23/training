import React, { useState, useEffect } from 'react';
import { Calendar, Dumbbell, TrendingUp, Brain, Target, ChevronRight, Activity, Moon, Zap, CheckCircle, Upload, Apple, Camera, Download, Settings as SettingsIcon, History as HistoryIcon } from 'lucide-react';
import { getCurrentDayKey, getTodayDateKey } from './utils/dateUtils';


// Import components
import WorkoutParser from './components/WorkoutParser';
import ProgressCharts from './components/ProgressCharts';
import AICoach from './components/AICoach';
import ProgressPhotos from './components/ProgressPhotos';
import ExportData from './components/ExportData';
import EnhancedCalendar from './components/EnhancedCalendar';
import WorkoutHistory from './components/WorkoutHistory';
import Settings from './components/Settings';

// Import utils
import { getWorkoutLogs, saveWorkoutLogs, getDailyFeelings, saveDailyFeeling } from './utils/storageHelper';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const logs = await getWorkoutLogs();
      setWorkoutLog(logs);

      const feelings = await getDailyFeelings();
      const today = new Date().toISOString().split('T')[0];
      if (feelings[today]) {
        setTodayFeeling(feelings[today]);
      }
    } catch (error) {
      console.log('Primera carga, sin datos previos');
    }
  };

  const saveWorkoutLogData = async (newLog) => {
    setWorkoutLog(newLog);
    await saveWorkoutLogs(newLog);
    await loadData(); // Reload to get fresh data
  };

  const saveTodayFeelingData = async (feeling) => {
    const today = new Date().toISOString().split('T')[0];
    setTodayFeeling(feeling);
    await saveDailyFeeling(today, feeling);
  };

  const getCurrentDayKey = () => {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[new Date().getDay()];
  };

  const getTodayWorkout = () => {
    const dayKey = getCurrentDayKey();
    return WEEKLY_PLAN[dayKey];
  };

  // Render based on view
  if (view === 'parser') {
    return <WorkoutParser onSuccess={(logs) => { saveWorkoutLogData(logs); setView('home'); }} onClose={() => setView('home')} />;
  }

  if (view === 'charts') {
    return <ProgressCharts workoutLogs={workoutLog} onClose={() => setView('home')} />;
  }

  if (view === 'ai') {
    return <AICoach workoutLogs={workoutLog} onClose={() => setView('home')} />;
  }

  if (view === 'photos') {
    return <ProgressPhotos onClose={() => setView('home')} />;
  }

  if (view === 'export') {
    return <ExportData onClose={() => setView('home')} onImportSuccess={loadData} />;
  }

  if (view === 'calendar') {
    return <EnhancedCalendar onClose={() => setView('home')} onSelectDay={(day) => { setSelectedDay(day); setView('workout'); }} />;
  }

  if (view === 'history') {
    return <WorkoutHistory onClose={() => setView('home')} />;
  }

  if (view === 'feeling') {
    return <FeelingView onSave={saveTodayFeelingData} onBack={() => setView('home')} />;
  }

  if (view === 'workout') {
    return <WorkoutView day={selectedDay} workoutLog={workoutLog} onSave={saveWorkoutLogData} onBack={() => setView('home')} />;
  }

  if (view === 'settings') {
    return <Settings onBack={() => setView('home')} />;
  }

  // Home view
  return <HomeView 
    workoutLog={workoutLog} 
    todayFeeling={todayFeeling} 
    onNavigate={setView} 
    onSelectDay={(day) => { setSelectedDay(day); setView('workout'); }}
  />;
}

// Home View Component
function HomeView({ workoutLog, todayFeeling, onNavigate, onSelectDay }) {
  const todayWorkout = getTodayWorkout();
  const dayKey = getCurrentDayKey();
  const todayLogs = workoutLog[new Date().toISOString().split('T')[0]] || {};

  // Get recent workouts count
  const recentWorkouts = Object.keys(workoutLog).filter(date => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = (now - d) / (1000 * 60 * 60 * 24);
    return diffDays <= 7 && Object.keys(workoutLog[date]).length > 0;
  }).length;

  function getTodayWorkout() {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayKey = days[new Date().getDay()];
    return WEEKLY_PLAN[dayKey];
  }

  function getCurrentDayKey() {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[new Date().getDay()];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl shadow-2xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">💪 Training Tracker</h1>
          <p className="text-blue-100">Hola Rubén, ¡vamos a machacar!</p>
        </div>
        <button onClick={() => onNavigate('settings')} className="text-white/80 hover:text-white transition-colors">
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Import from Motra CTA */}
      <div className="mx-4 mt-6 bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-green-400 rounded-2xl p-4 shadow-lg">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          ¿Entrenaste en Motra?
        </h3>
        <p className="text-sm text-green-100 mb-3">Importa tu entrenamiento pegando el texto</p>
        <button 
          onClick={() => onNavigate('parser')}
          className="bg-white text-green-700 px-4 py-2 rounded-xl font-semibold hover:bg-green-50 transition-all w-full flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Importar desde Motra
        </button>
      </div>

      {/* Today's Feeling */}
      {!todayFeeling ? (
        <div className="mx-4 mt-6 bg-yellow-500/20 border-2 border-yellow-500 rounded-2xl p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            ¿Cómo te sientes hoy?
          </h3>
          <button 
            onClick={() => onNavigate('feeling')}
            className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-semibold hover:bg-yellow-400 transition-all"
          >
            Registrar sensaciones
          </button>
        </div>
      ) : (
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
              onClick={() => onSelectDay(dayKey)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Dumbbell className="w-5 h-5" />
              {Object.keys(todayLogs).length > 0 ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Main Features Grid */}
      <div className="grid grid-cols-2 gap-4 mx-4 mt-6">
        <button 
          onClick={() => onNavigate('charts')}
          className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 p-4 rounded-2xl transition-all shadow-lg"
        >
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-white" />
          <div className="font-semibold">Gráficas</div>
          <div className="text-xs text-green-200">Progreso</div>
        </button>

        <button 
          onClick={() => onNavigate('ai')}
          className="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-4 rounded-2xl transition-all shadow-lg"
        >
          <Brain className="w-8 h-8 mx-auto mb-2 text-white" />
          <div className="font-semibold">Coach IA</div>
          <div className="text-xs text-purple-200">Consulta</div>
        </button>

        <button 
          onClick={() => onNavigate('photos')}
          className="bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 p-4 rounded-2xl transition-all shadow-lg"
        >
          <Camera className="w-8 h-8 mx-auto mb-2 text-white" />
          <div className="font-semibold">Fotos</div>
          <div className="text-xs text-blue-200">Progreso</div>
        </button>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        <button 
          onClick={() => onNavigate('calendar')}
          className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl transition-all"
        >
          <Calendar className="w-7 h-7 mx-auto mb-2 text-blue-400" />
          <div className="font-semibold text-sm">Calendario</div>
        </button>

        <button 
          onClick={() => onNavigate('history')}
          className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl transition-all"
        >
          <HistoryIcon className="w-7 h-7 mx-auto mb-2 text-purple-400" />
          <div className="font-semibold text-sm">Historial</div>
        </button>

        <button 
          onClick={() => onNavigate('export')}
          className="bg-slate-700 hover:bg-slate-600 p-4 rounded-2xl transition-all"
        >
          <Download className="w-7 h-7 mx-auto mb-2 text-green-400" />
          <div className="font-semibold text-sm">Exportar</div>
        </button>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-6 bg-slate-800 rounded-2xl p-4">
        <h3 className="font-bold mb-3">📊 Resumen</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{Object.keys(workoutLog).filter(d => Object.keys(workoutLog[d]).length > 0).length}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{recentWorkouts}</div>
            <div className="text-xs text-gray-400">Esta semana</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {Object.values(workoutLog).reduce((acc, day) => acc + Object.keys(day).length, 0)}
            </div>
            <div className="text-xs text-gray-400">Ejercicios</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feeling View Component (sin cambios)
function FeelingView({ onSave, onBack }) {
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [motivation, setMotivation] = useState(5);

  const handleSave = () => {
    onSave({ energy, sleep, motivation, date: new Date().toISOString() });
    onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300">
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
}

// Workout View Component (sin cambios)
function WorkoutView({ day, workoutLog, onSave, onBack }) {
  const workout = WEEKLY_PLAN[day];
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
    onSave(newWorkoutLog);
  };

  if (!workout) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {workout.emoji} {DAYS_NAMES[day]}
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
}

// Settings View Component (sin cambios)
// function SettingsView({ onBack }) {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
//       <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300">
//         ← Volver
//       </button>

//       <h1 className="text-3xl font-bold mb-8">⚙️ Configuración</h1>

//       <div className="bg-slate-800 rounded-2xl p-6">
//         <h3 className="font-bold mb-4">Acerca de</h3>
//         <div className="space-y-2 text-sm text-gray-300">
//           <p><strong>Versión:</strong> 2.0.0</p>
//           <p><strong>Desarrollado para:</strong> Rubén</p>
//           <p className="pt-4 text-gray-400">
//             Training Tracker - App profesional de seguimiento de entrenamientos con IA, gráficas, nutrición y más.
//           </p>
//         </div>
//       </div>

//       <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-sm text-gray-300">
//         <p className="font-semibold mb-2">💡 Características:</p>
//         <ul className="space-y-1 ml-4 list-disc">
//           <li>Importación desde Motra con selección de fecha</li>
//           <li>Calendario mejorado con visualización de entrenamientos</li>
//           <li>Historial completo con búsqueda y filtros</li>
//           <li>Gráficas de progreso interactivas</li>
//           <li>Coach IA personalizado</li>
//           <li>Tracking de nutrición</li>
//           <li>Fotos de progreso con comparación</li>
//           <li>Exportar/Importar datos</li>
//           <li>PWA instalable en iPhone</li>
//         </ul>
//       </div>
//     </div>
//   );
// }