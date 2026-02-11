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
import { getWorkoutLogs, saveWorkoutLogs, getDailyFeelings, saveDailyFeeling, getSettings, mergeSupabaseData, saveWorkoutForDate } from './utils/storageHelper';
import { initSupabase, autoLoadFromSupabase } from './utils/database';

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
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    
    try {
      // 1. Cargar configuración de Supabase
      const settings = await getSettings();
      
      // 2. Si hay configuración de Supabase, inicializarla
      if (settings.supabaseUrl && settings.supabaseKey) {
        const client = initSupabase(settings.supabaseUrl, settings.supabaseKey);
        
        if (client) {
          setSupabaseInitialized(true);
          console.log('✅ Supabase inicializado');
          
          // 3. AUTO-LOAD: Cargar datos desde Supabase
          const supabaseData = await autoLoadFromSupabase();
          
          if (supabaseData) {
            // 4. Merge con datos locales
            await mergeSupabaseData(supabaseData);
            console.log('✅ Datos de Supabase cargados y mergeados');
          }
        }
      }
      
      // 5. Cargar datos locales (ya mergeados con Supabase si aplica)
      await loadData();
      
    } catch (error) {
      console.error('Error inicializando app:', error);
      // Continuar con datos locales aunque falle Supabase
      await loadData();
    }
    
    setIsLoading(false);
  };

  const loadData = async () => {
    try {
      const logs = await getWorkoutLogs();
      setWorkoutLog(logs);

      const feelings = await getDailyFeelings();
      const today = getTodayDateKey();
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
    // No es necesario recargar, saveWorkoutLogs ya hace auto-sync
  };

  const saveTodayFeelingData = async (feeling) => {
    const today = getTodayDateKey();
    setTodayFeeling(feeling);
    await saveDailyFeeling(today, feeling);
    // saveDailyFeeling ya hace auto-sync
  };

  const getTodayWorkout = () => {
    const dayKey = getCurrentDayKey();
    return WEEKLY_PLAN[dayKey];
  };

  // Mostrar loading mientras se inicializa
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando datos...</p>
          {supabaseInitialized && (
            <p className="text-sm text-blue-400 mt-2">Sincronizando con la nube ☁️</p>
          )}
        </div>
      </div>
    );
  }

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
    return <Settings onBack={() => setView('home')} onSupabaseConfigured={initializeApp} />;
  }

  // Home view
  return <HomeView 
    workoutLog={workoutLog} 
    todayFeeling={todayFeeling} 
    onNavigate={setView} 
    onSelectDay={(day) => { setSelectedDay(day); setView('workout'); }}
    supabaseConnected={supabaseInitialized}
  />;
}

// Home View Component
function HomeView({ workoutLog, todayFeeling, onNavigate, onSelectDay, supabaseConnected }) {
  const todayWorkout = getTodayWorkout();
  const dayKey = getCurrentDayKey();
  const todayDateKey = getTodayDateKey();
  const todayLogs = workoutLog[todayDateKey] || {};

  // Get recent workouts count
  const recentWorkouts = Object.keys(workoutLog).filter(date => {
    const d = new Date(date + 'T12:00:00'); // Fix timezone
    const now = new Date();
    const diffDays = (now - d) / (1000 * 60 * 60 * 24);
    return diffDays <= 7 && Object.keys(workoutLog[date]).length > 0;
  }).length;

  const totalWorkouts = Object.keys(workoutLog).filter(date => 
    Object.keys(workoutLog[date]).length > 0
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Training Tracker</h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {supabaseConnected && (
              <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Cloud
              </div>
            )}
            <button
              onClick={() => onNavigate('settings')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Today's feeling indicator */}
        {todayFeeling && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 rounded-2xl p-4 mb-4">
            <p className="text-sm text-gray-300 mb-2">Tu estado hoy:</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold">{todayFeeling.energy}/10</span>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold">{todayFeeling.sleep}/10</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold">{todayFeeling.motivation}/10</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's workout */}
      <div className="mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-blue-100 mb-1">Entrenamiento de hoy</p>
            <h2 className="text-2xl font-bold mb-1">
              {todayWorkout.emoji} {todayWorkout.name}
            </h2>
            <p className="text-blue-100">{todayWorkout.muscle}</p>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
            {todayWorkout.intensity}
          </div>
        </div>

        {Object.keys(todayLogs).length > 0 && (
          <div className="bg-white/10 rounded-xl p-3 mb-4">
            <p className="text-sm text-white/90 mb-2">
              ✅ {Object.keys(todayLogs).length} ejercicio{Object.keys(todayLogs).length !== 1 ? 's' : ''} registrado{Object.keys(todayLogs).length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(todayLogs).slice(0, 3).map((ex, idx) => (
                <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {ex}
                </span>
              ))}
              {Object.keys(todayLogs).length > 3 && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  +{Object.keys(todayLogs).length - 3} más
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onSelectDay(dayKey)}
          className="w-full bg-white text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          <Dumbbell className="w-5 h-5" />
          {Object.keys(todayLogs).length > 0 ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}
        </button>
      </div>

      {/* Weekly plan */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3">Plan Semanal</h3>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_ORDER.map((day) => {
            const workout = WEEKLY_PLAN[day];
            const isToday = day === dayKey;
            
            return (
              <button
                key={day}
                onClick={() => onSelectDay(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition-all ${
                  isToday 
                    ? 'bg-blue-600 ring-2 ring-blue-400 scale-105' 
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <div className="text-xl mb-1">{workout.emoji}</div>
                <div className="text-[10px] text-center leading-tight">
                  {DAYS_NAMES[day].substring(0, 3)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => onNavigate('feeling')}
          className="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl p-4 transition-all text-left"
        >
          <Activity className="w-8 h-8 mb-2" />
          <div className="font-bold">Sensaciones</div>
          <div className="text-xs text-purple-100">Registra cómo te sientes</div>
        </button>

        <button
          onClick={() => onNavigate('calendar')}
          className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-2xl p-4 transition-all text-left"
        >
          <Calendar className="w-8 h-8 mb-2" />
          <div className="font-bold">Calendario</div>
          <div className="text-xs text-green-100">Vista mensual</div>
        </button>

        <button
          onClick={() => onNavigate('charts')}
          className="bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-2xl p-4 transition-all text-left"
        >
          <TrendingUp className="w-8 h-8 mb-2" />
          <div className="font-bold">Progreso</div>
          <div className="text-xs text-blue-100">Gráficas y stats</div>
        </button>

        <button
          onClick={() => onNavigate('ai')}
          className="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-2xl p-4 transition-all text-left"
        >
          <Brain className="w-8 h-8 mb-2" />
          <div className="font-bold">Coach IA</div>
          <div className="text-xs text-orange-100">Análisis y consejos</div>
        </button>
      </div>

      {/* More actions */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => onNavigate('parser')}
          className="w-full bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 transition-all flex items-center gap-3"
        >
          <Upload className="w-6 h-6 text-blue-400" />
          <div className="flex-1 text-left">
            <div className="font-semibold">Importar desde Motra</div>
            <div className="text-xs text-gray-400">Copia y pega tu entrenamiento</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => onNavigate('history')}
          className="w-full bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 transition-all flex items-center gap-3"
        >
          <HistoryIcon className="w-6 h-6 text-purple-400" />
          <div className="flex-1 text-left">
            <div className="font-semibold">Historial</div>
            <div className="text-xs text-gray-400">Todos tus entrenamientos</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => onNavigate('photos')}
          className="w-full bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 transition-all flex items-center gap-3"
        >
          <Camera className="w-6 h-6 text-green-400" />
          <div className="flex-1 text-left">
            <div className="font-semibold">Fotos de progreso</div>
            <div className="text-xs text-gray-400">Compara tu evolución</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => onNavigate('export')}
          className="w-full bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 transition-all flex items-center gap-3"
        >
          <Download className="w-6 h-6 text-orange-400" />
          <div className="flex-1 text-left">
            <div className="font-semibold">Exportar / Importar</div>
            <div className="text-xs text-gray-400">Backup de tus datos</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Stats */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="font-bold mb-3 text-sm text-gray-400">ESTADÍSTICAS</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-400">{totalWorkouts}</div>
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

// Feeling View Component
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

// Workout View Component
function WorkoutView({ day, workoutLog, onSave, onBack }) {
  const workout = WEEKLY_PLAN[day];
  const dateKey = getTodayDateKey();
  const [localLog, setLocalLog] = useState(workoutLog[dateKey] || {});

  const handleExerciseLog = async (exerciseName, setIndex, weight, reps) => {
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
    
    // Guardar con auto-sync
    await onSave(newWorkoutLog);
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

function getTodayWorkout() {
  const dayKey = getCurrentDayKey();
  return WEEKLY_PLAN[dayKey];
}