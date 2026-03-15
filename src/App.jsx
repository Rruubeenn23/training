import React, { useState, useEffect } from 'react';
import {
  Home, Dumbbell, Apple, TrendingUp, Brain, Target,
  ChevronLeft, ChevronRight, Activity, Moon, Zap,
  Check, Plus, Minus, Upload, Camera, Download,
  Settings as SettingsIcon, History as HistoryIcon,
  Calendar, Flame
} from 'lucide-react';
import { getCurrentDayKey, getTodayDateKey } from './utils/dateUtils';

import WorkoutParser from './components/WorkoutParser';
import ProgressCharts from './components/ProgressCharts';
import AICoach from './components/AICoach';
import ProgressPhotos from './components/ProgressPhotos';
import ExportData from './components/ExportData';
import EnhancedCalendar from './components/EnhancedCalendar';
import WorkoutHistory from './components/WorkoutHistory';
import Settings from './components/Settings';

import {
  getWorkoutLogs, saveWorkoutLogs,
  getDailyFeelings, saveDailyFeeling,
  getSettings, mergeSupabaseData,
  getNutritionLogs, saveNutritionLog
} from './utils/storageHelper';
import { initSupabase, autoLoadFromSupabase } from './utils/database';

// ─── Weekly Plan ────────────────────────────────────────────────────────────
const WEEKLY_PLAN = {
  lunes: {
    name: 'Empuje Fuerte', emoji: '🔵',
    muscle: 'Pecho + Hombro + Tríceps', intensity: 'Alta',
    exercises: [
      { name: 'Press banca',                weight: '55/60/65 kg',   reps: '8/6-8/5-6' },
      { name: 'Press inclinado mancuernas', weight: '17.5 kg',       reps: '3×8-10' },
      { name: 'Cruces polea',              weight: '10-12 kg',       reps: '2×12-15' },
      { name: 'Press militar',             weight: '45 kg',          reps: '3×6-8' },
      { name: 'Fondos',                    weight: 'PC + 2.5-5 kg',  reps: '3×6-10' },
      { name: 'Extensión polea',           weight: '32-35 kg',       reps: '2×10-12' },
      { name: 'Extensión overhead',        weight: '22-25 kg',       reps: '2×12-15' },
    ],
  },
  martes: {
    name: 'Tracción', emoji: '🟢',
    muscle: 'Espalda + Bíceps', intensity: 'Medio-Alto',
    exercises: [
      { name: 'Jalón',                      weight: '75/80/80 kg', reps: '10/8-10/6-8' },
      { name: 'Remo multipower',            weight: '50 kg',       reps: '3×8-10' },
      { name: 'Remo polea',                 weight: '60 kg',       reps: '2×10-12' },
      { name: 'Remo unilateral polea',      weight: 'Medio-alto',  reps: '2×10-12' },
      { name: 'Pull-over',                  weight: '35 kg',       reps: '2×12-15' },
      { name: 'Curl EZ',                    weight: '30 kg',       reps: '3×8-8-6' },
      { name: 'Curl polea/martillo',        weight: 'Medio',       reps: '2×10-12' },
      { name: 'Curl polea baja',            weight: '25 kg',       reps: '2×12-15' },
    ],
  },
  miercoles: {
    name: 'Pierna Completa', emoji: '🟡',
    muscle: 'Cuádriceps + Femoral + Gemelos', intensity: 'Media',
    exercises: [
      { name: 'Sentadilla',                   weight: '70/80/82.5 kg', reps: '8/6-8/6' },
      { name: 'Zancadas',                     weight: '17.5 kg',       reps: '2×10-12' },
      { name: 'Sentadilla pies adelantados',  weight: 'Medio',         reps: '2×10-12' },
      { name: 'Peso muerto rumano',           weight: '60-70 kg',      reps: '3×8-10' },
      { name: 'Curl femoral',                 weight: 'Medio',         reps: '2×12-15' },
      { name: 'Gemelos',                      weight: 'Medio-alto',    reps: '3×15-20' },
    ],
  },
  jueves: {
    name: 'Bomba / Recuperación', emoji: '🟣',
    muscle: 'Volumen ligero', intensity: 'Media-Baja',
    exercises: [
      { name: 'Elevaciones laterales',      reps: '3×12-15' },
      { name: 'Pájaros',                    reps: '3×12-15' },
      { name: 'Press militar ligero',       reps: '2×8-10' },
      { name: 'Press inclinado multipower', reps: '2×8-10' },
      { name: 'Aperturas inclinadas',       reps: '2×12-15' },
      { name: 'Curl polea',                 reps: '2×12-15' },
      { name: 'Extensión polea',            reps: '2×12-15' },
      { name: 'Fondos banco',               reps: '2×12-15' },
    ],
  },
  viernes:  { name: 'Fútbol',          emoji: '🔴', muscle: 'HIIT Natural',           intensity: 'Alta',      exercises: [] },
  sabado:   { name: 'Descanso',         emoji: '🟤', muscle: 'Recuperación activa',    intensity: 'Baja',      exercises: [] },
  domingo:  { name: 'Pádel (Opcional)', emoji: '⚪', muscle: 'Aeróbico intermitente',  intensity: 'Media',     exercises: [] },
};

const DAYS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAYS_NAMES = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

function getTodayWorkoutData() {
  return WEEKLY_PLAN[getCurrentDayKey()];
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [workoutLog, setWorkoutLog] = useState({});
  const [todayFeeling, setTodayFeeling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);

  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      const settings = await getSettings();
      if (settings.supabaseUrl && settings.supabaseKey) {
        const client = initSupabase(settings.supabaseUrl, settings.supabaseKey);
        if (client) {
          setSupabaseInitialized(true);
          const supabaseData = await autoLoadFromSupabase();
          if (supabaseData) await mergeSupabaseData(supabaseData);
        }
      }
      await loadData();
    } catch (error) {
      console.error('Error inicializando app:', error);
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
      if (feelings[today]) setTodayFeeling(feelings[today]);
    } catch {
      console.log('Primera carga, sin datos previos');
    }
  };

  const saveWorkoutLogData = async (newLog) => {
    setWorkoutLog(newLog);
    await saveWorkoutLogs(newLog);
  };

  const saveTodayFeelingData = async (feeling) => {
    setTodayFeeling(feeling);
    await saveDailyFeeling(getTodayDateKey(), feeling);
  };

  const goBack = () => setScreen(null);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando...</p>
          {supabaseInitialized && (
            <p className="text-xs text-blue-400 mt-1">Sincronizando ☁️</p>
          )}
        </div>
      </div>
    );
  }

  // Full-screen overlays (no bottom nav)
  if (screen === 'parser')
    return <WorkoutParser onSuccess={(logs) => { saveWorkoutLogData(logs); goBack(); }} onClose={goBack} />;
  if (screen === 'calendar')
    return <EnhancedCalendar onClose={goBack} onSelectDay={(day) => { setSelectedDay(day); setScreen('day-workout'); }} />;
  if (screen === 'history')   return <WorkoutHistory onClose={goBack} />;
  if (screen === 'photos')    return <ProgressPhotos onClose={goBack} />;
  if (screen === 'export')    return <ExportData onClose={goBack} onImportSuccess={loadData} />;
  if (screen === 'settings')  return <Settings onBack={goBack} onSupabaseConfigured={initializeApp} />;
  if (screen === 'feeling')   return <FeelingView onSave={saveTodayFeelingData} onBack={goBack} existing={todayFeeling} />;
  if (screen === 'charts')    return <ProgressCharts workoutLogs={workoutLog} onClose={goBack} />;
  if (screen === 'day-workout')
    return <WorkoutDayView day={selectedDay} workoutLog={workoutLog} onSave={saveWorkoutLogData} onBack={goBack} />;

  // Coach tab is full-screen (no bottom nav) — AICoach handles its own layout
  if (tab === 'coach') {
    return <AICoach workoutLogs={workoutLog} onClose={() => setTab('home')} />;
  }

  // Main layout with bottom nav
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pb-20">
        {tab === 'home' && (
          <HomeView
            workoutLog={workoutLog}
            todayFeeling={todayFeeling}
            onNavigate={setScreen}
            onSelectDay={(day) => { setSelectedDay(day); setScreen('day-workout'); }}
            onTab={setTab}
            supabaseConnected={supabaseInitialized}
          />
        )}
        {tab === 'train' && (
          <TrainView
            workoutLog={workoutLog}
            onSave={saveWorkoutLogData}
            onNavigate={setScreen}
          />
        )}
        {tab === 'nutrition' && <NutritionView />}
        {tab === 'progress' && (
          <ProgressView workoutLog={workoutLog} onNavigate={setScreen} />
        )}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: 'home',      icon: Home,      label: 'Inicio'    },
    { id: 'train',     icon: Dumbbell,  label: 'Entrenar'  },
    { id: 'nutrition', icon: Apple,     label: 'Nutrición' },
    { id: 'progress',  icon: TrendingUp,label: 'Progreso'  },
    { id: 'coach',     icon: Brain,     label: 'Coach IA'  },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 z-50">
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-4 max-w-lg mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all ${
                active ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-500/20' : ''}`}>
                <Icon className={`w-[22px] h-[22px] transition-transform ${active ? 'scale-110' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-blue-400' : 'text-slate-500'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeView({ workoutLog, todayFeeling, onNavigate, onSelectDay, onTab, supabaseConnected }) {
  const todayWorkout = getTodayWorkoutData();
  const dayKey = getCurrentDayKey();
  const todayDateKey = getTodayDateKey();
  const todayLogs = workoutLog[todayDateKey] || {};

  const recentWorkouts = Object.keys(workoutLog).filter(date => {
    const diff = (new Date() - new Date(date + 'T12:00:00')) / 86400000;
    return diff <= 7 && Object.keys(workoutLog[date]).length > 0;
  }).length;

  const totalWorkouts = Object.keys(workoutLog).filter(d => Object.keys(workoutLog[d]).length > 0).length;
  const totalExercises = Object.values(workoutLog).reduce((a, d) => a + Object.keys(d).length, 0);

  return (
    <div className="p-5 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Training Tracker</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {supabaseConnected && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Cloud
            </div>
          )}
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all"
          >
            <SettingsIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Today's workout hero */}
      <button
        onClick={() => onTab('train')}
        className="w-full bg-gradient-to-br from-blue-600 to-violet-600 rounded-3xl p-5 mb-4 shadow-xl text-left active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-blue-100 text-xs mb-1">Entrenamiento de hoy</p>
            <h2 className="text-xl font-bold">{todayWorkout.emoji} {todayWorkout.name}</h2>
            <p className="text-blue-100/80 text-sm">{todayWorkout.muscle}</p>
          </div>
          <span className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">
            {todayWorkout.intensity}
          </span>
        </div>

        {Object.keys(todayLogs).length > 0 && (
          <div className="bg-white/10 rounded-2xl p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-300" />
              <span className="text-sm text-white/90">
                {Object.keys(todayLogs).length} ejercicio{Object.keys(todayLogs).length !== 1 ? 's' : ''} registrado{Object.keys(todayLogs).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(todayLogs).slice(0, 3).map((ex, i) => (
                <span key={i} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{ex}</span>
              ))}
              {Object.keys(todayLogs).length > 3 && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">+{Object.keys(todayLogs).length - 3} más</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-white/20 rounded-2xl px-4 py-3">
          <span className="font-semibold text-sm">
            {Object.keys(todayLogs).length > 0 ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}
          </span>
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>

      {/* Feeling */}
      {todayFeeling ? (
        <button
          onClick={() => onNavigate('feeling')}
          className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 mb-4 text-left hover:bg-slate-700/60 transition-all"
        >
          <p className="text-xs text-slate-400 mb-2">Estado de hoy</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold">{todayFeeling.energy}</span>
              <span className="text-xs text-slate-400">/10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="font-bold">{todayFeeling.sleep}</span>
              <span className="text-xs text-slate-400">/10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-rose-400" />
              <span className="font-bold">{todayFeeling.motivation}</span>
              <span className="text-xs text-slate-400">/10</span>
            </div>
          </div>
        </button>
      ) : (
        <button
          onClick={() => onNavigate('feeling')}
          className="w-full bg-slate-800 border border-dashed border-slate-600 rounded-2xl p-4 mb-4 flex items-center gap-3 text-left hover:bg-slate-700/60 transition-all"
        >
          <Activity className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">¿Cómo te sientes hoy?</p>
            <p className="text-xs text-slate-400">Registra energía, sueño y motivación</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      )}

      {/* Weekly plan */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Plan Semanal</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS_ORDER.map(day => {
            const w = WEEKLY_PLAN[day];
            const isToday = day === dayKey;
            return (
              <button
                key={day}
                onClick={() => isToday ? onTab('train') : onSelectDay(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isToday
                    ? 'bg-blue-600 ring-2 ring-blue-400 scale-105 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700/50'
                }`}
              >
                <span className="text-base leading-none">{w.emoji}</span>
                <span className="text-[9px] leading-none text-white/70">{DAYS_NAMES[day].slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total', value: totalWorkouts, color: 'text-blue-400' },
          { label: 'Esta semana', value: recentWorkouts, color: 'text-violet-400' },
          { label: 'Ejercicios', value: totalExercises, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <button
        onClick={() => onNavigate('parser')}
        className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 hover:bg-slate-700/60 transition-all text-left"
      >
        <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <Upload className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Importar desde Motra</div>
          <div className="text-xs text-slate-400">Copia y pega tu entrenamiento</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}

// ─── Train Tab (inline set logging) ──────────────────────────────────────────
function TrainView({ workoutLog, onSave, onNavigate }) {
  const dayKey = getCurrentDayKey();
  const workout = WEEKLY_PLAN[dayKey];
  const todayDateKey = getTodayDateKey();

  const [localLog, setLocalLog] = useState({});
  const [setInputs, setSetInputs] = useState({});

  useEffect(() => {
    const log = workoutLog[todayDateKey] || {};
    setLocalLog(log);
    const inputs = {};
    Object.entries(log).forEach(([exName, sets]) => {
      inputs[exName] = {};
      Object.entries(sets).forEach(([setNum, data]) => {
        inputs[exName][setNum] = { weight: data.weight || '', reps: data.reps || '' };
      });
    });
    setSetInputs(inputs);
  }, [workoutLog, todayDateKey]);

  const handleSetChange = (exName, setNum, field, value) => {
    setSetInputs(prev => ({
      ...prev,
      [exName]: { ...(prev[exName] || {}), [setNum]: { ...(prev[exName]?.[setNum] || {}), [field]: value } },
    }));
  };

  const handleSetSave = async (exName, setNum) => {
    const input = setInputs[exName]?.[setNum];
    if (!input?.weight || !input?.reps) return;
    const newLog = {
      ...localLog,
      [exName]: {
        ...(localLog[exName] || {}),
        [setNum]: { weight: input.weight, reps: input.reps, timestamp: new Date().toISOString() },
      },
    };
    setLocalLog(newLog);
    await onSave({ ...workoutLog, [todayDateKey]: newLog });
  };

  const totalLogged = Object.keys(localLog).length;
  const totalExercises = workout.exercises.length;

  return (
    <div className="p-5 pt-6">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Hoy</p>
            <h1 className="text-2xl font-bold">{workout.emoji} {workout.name}</h1>
            <p className="text-slate-400 text-sm">{workout.muscle}</p>
          </div>
          <span className="bg-slate-800 border border-slate-700/50 text-xs font-medium px-3 py-1.5 rounded-full text-slate-300 mt-1">
            {workout.intensity}
          </span>
        </div>
        {totalExercises > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${(totalLogged / totalExercises) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-10 text-right">{totalLogged}/{totalExercises}</span>
          </div>
        )}
      </div>

      {/* Import shortcut */}
      <button
        onClick={() => onNavigate('parser')}
        className="w-full bg-slate-800 border border-dashed border-slate-600 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-slate-400 hover:bg-slate-700/60 transition-all"
      >
        <Upload className="w-4 h-4" />
        Importar desde Motra
      </button>

      {/* Exercises */}
      {workout.exercises.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">{workout.emoji}</div>
          <p className="text-slate-300 font-semibold text-lg">{workout.name}</p>
          <p className="text-slate-500 text-sm mt-2">{workout.muscle}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workout.exercises.map((exercise, idx) => (
            <ExerciseCard
              key={idx}
              exercise={exercise}
              localLog={localLog}
              setInputs={setInputs}
              onSetChange={handleSetChange}
              onSetSave={handleSetSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exercise Card (inline set inputs) ───────────────────────────────────────
function ExerciseCard({ exercise, localLog, setInputs, onSetChange, onSetSave }) {
  const exerciseLog = localLog[exercise.name] || {};

  const numSets = (() => {
    const r = exercise.reps;
    if (!r) return 3;
    const m = r.match(/^(\d+)\s*[×x]/);
    if (m) return parseInt(m[1]);
    const slashes = (r.match(/\//g) || []).length;
    return slashes > 0 ? slashes + 1 : 3;
  })();

  const loggedSets = Object.keys(exerciseLog).filter(k => exerciseLog[k]?.weight && exerciseLog[k]?.reps).length;
  const isComplete = loggedSets >= numSets;

  return (
    <div className={`bg-slate-800 border rounded-2xl p-4 transition-all ${
      isComplete ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-700/50'
    }`}>
      {/* Exercise header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate">{exercise.name}</h3>
            {isComplete && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          </div>
          {(exercise.weight || exercise.reps) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {exercise.weight}{exercise.weight && exercise.reps ? ' · ' : ''}{exercise.reps}
            </p>
          )}
        </div>
        {loggedSets > 0 && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 ${
            isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {loggedSets}/{numSets}
          </span>
        )}
      </div>

      {/* Set rows */}
      <div className="space-y-2">
        {Array.from({ length: numSets }, (_, i) => i + 1).map(setNum => {
          const logged = exerciseLog[setNum];
          const input = setInputs[exercise.name]?.[setNum] || { weight: '', reps: '' };
          const hasInput = input.weight && input.reps;

          return (
            <div
              key={setNum}
              className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                logged ? 'bg-emerald-900/25 border border-emerald-800/30' : 'bg-slate-700/40'
              }`}
            >
              <span className="text-slate-400 text-sm font-medium w-8">S{setNum}</span>
              <input
                type="number"
                value={input.weight}
                onChange={e => onSetChange(exercise.name, setNum, 'weight', e.target.value)}
                placeholder="kg"
                step="0.5"
                min="0"
                className="w-16 bg-slate-900 rounded-lg px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinner"
              />
              <span className="text-slate-600 text-sm">×</span>
              <input
                type="number"
                value={input.reps}
                onChange={e => onSetChange(exercise.name, setNum, 'reps', e.target.value)}
                placeholder="reps"
                min="0"
                className="w-16 bg-slate-900 rounded-lg px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinner"
              />
              <button
                onClick={() => onSetSave(exercise.name, setNum)}
                disabled={!hasInput}
                className={`ml-auto p-2 rounded-lg transition-all ${
                  logged
                    ? 'bg-emerald-600 text-white'
                    : hasInput
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Workout Day View (overlay for specific day) ──────────────────────────────
function WorkoutDayView({ day, workoutLog, onSave, onBack }) {
  const workout = WEEKLY_PLAN[day];
  const todayDateKey = getTodayDateKey();

  const [localLog, setLocalLog] = useState({});
  const [setInputs, setSetInputs] = useState({});

  useEffect(() => {
    const log = workoutLog[todayDateKey] || {};
    setLocalLog(log);
    const inputs = {};
    Object.entries(log).forEach(([exName, sets]) => {
      inputs[exName] = {};
      Object.entries(sets).forEach(([setNum, data]) => {
        inputs[exName][setNum] = { weight: data.weight || '', reps: data.reps || '' };
      });
    });
    setSetInputs(inputs);
  }, []);

  const handleSetChange = (exName, setNum, field, value) => {
    setSetInputs(prev => ({
      ...prev,
      [exName]: { ...(prev[exName] || {}), [setNum]: { ...(prev[exName]?.[setNum] || {}), [field]: value } },
    }));
  };

  const handleSetSave = async (exName, setNum) => {
    const input = setInputs[exName]?.[setNum];
    if (!input?.weight || !input?.reps) return;
    const newLog = {
      ...localLog,
      [exName]: {
        ...(localLog[exName] || {}),
        [setNum]: { weight: input.weight, reps: input.reps, timestamp: new Date().toISOString() },
      },
    };
    setLocalLog(newLog);
    await onSave({ ...workoutLog, [todayDateKey]: newLog });
  };

  if (!workout) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-5 pt-6 pb-24">
        <button onClick={onBack} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Volver</span>
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-bold mb-1">{workout.emoji} {DAYS_NAMES[day]}</h1>
          <p className="text-slate-400">{workout.name} · {workout.muscle}</p>
        </div>

        {workout.exercises.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">{workout.emoji}</div>
            <p className="text-slate-300 font-semibold text-lg">{workout.name}</p>
            <p className="text-slate-500 text-sm mt-2">{workout.muscle}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workout.exercises.map((exercise, idx) => (
              <ExerciseCard
                key={idx}
                exercise={exercise}
                localLog={localLog}
                setInputs={setInputs}
                onSetChange={handleSetChange}
                onSetSave={handleSetSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feeling View ─────────────────────────────────────────────────────────────
function FeelingView({ onSave, onBack, existing }) {
  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [sleep, setSleep] = useState(existing?.sleep ?? 5);
  const [motivation, setMotivation] = useState(existing?.motivation ?? 5);

  const handleSave = () => {
    onSave({ energy, sleep, motivation, date: new Date().toISOString() });
    onBack();
  };

  const metrics = [
    { label: 'Energía',            value: energy,     set: setEnergy,     icon: Zap,    color: 'text-amber-400', accent: '#f59e0b' },
    { label: 'Calidad del sueño',  value: sleep,      set: setSleep,      icon: Moon,   color: 'text-blue-400',  accent: '#3b82f6' },
    { label: 'Motivación',         value: motivation, set: setMotivation, icon: Target, color: 'text-rose-400',  accent: '#f43f5e' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-6 pt-2 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        <span className="font-medium">Volver</span>
      </button>

      <h1 className="text-2xl font-bold mb-1">¿Cómo te sientes?</h1>
      <p className="text-slate-400 text-sm mb-6 capitalize">
        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <div className="space-y-4 mb-6">
        {metrics.map(({ label, value, set, icon: Icon, color, accent }) => (
          <div key={label} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="font-semibold">{label}</span>
              </div>
              <div className={`text-3xl font-bold ${color}`}>
                {value}<span className="text-base text-slate-400 font-normal">/10</span>
              </div>
            </div>
            <input
              type="range"
              min="1" max="10"
              value={value}
              onChange={e => set(parseInt(e.target.value))}
              style={{ '--accent': accent }}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-slider bg-slate-700"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Bajo</span>
              <span>Alto</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg"
      >
        Guardar sensaciones
      </button>
    </div>
  );
}

// ─── Nutrition Tab ────────────────────────────────────────────────────────────
const NUTRITION_GOALS = { protein: 170, carbs: 200, fats: 70, water: 8 };
const CAL_GOAL = 2200;

function NutritionView() {
  const [dateKey, setDateKey] = useState(getTodayDateKey());
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs]     = useState(0);
  const [fats, setFats]       = useState(0);
  const [water, setWater]     = useState(0);
  const [saved, setSaved]     = useState(false);

  useEffect(() => { loadNutrition(); }, [dateKey]);

  const loadNutrition = async () => {
    const logs = await getNutritionLogs();
    const e = logs[dateKey] || {};
    setProtein(e.protein ?? 0);
    setCarbs(e.carbs ?? 0);
    setFats(e.fats ?? 0);
    setWater(e.water ?? 0);
    setSaved(false);
  };

  const handleSave = async () => {
    await saveNutritionLog(dateKey, { protein, carbs, fats, water });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const changeDate = (delta) => {
    const d = new Date(dateKey + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const newKey = d.toISOString().split('T')[0];
    if (newKey <= getTodayDateKey()) setDateKey(newKey);
  };

  const isToday = dateKey === getTodayDateKey();
  const dateLabel = isToday
    ? 'Hoy'
    : new Date(dateKey + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

  const calories = Math.round(protein * 4 + carbs * 4 + fats * 9);
  const calPct   = Math.min(100, (calories / CAL_GOAL) * 100);

  const macros = [
    { label: 'Proteína',       value: protein, set: setProtein, goal: NUTRITION_GOALS.protein, icon: '🥩', color: 'text-blue-400',   bar: 'bg-blue-500',   step: 5,  unit: 'g' },
    { label: 'Carbohidratos',  value: carbs,   set: setCarbs,   goal: NUTRITION_GOALS.carbs,   icon: '🌾', color: 'text-amber-400',  bar: 'bg-amber-500',  step: 10, unit: 'g' },
    { label: 'Grasas',         value: fats,    set: setFats,    goal: NUTRITION_GOALS.fats,    icon: '🥑', color: 'text-purple-400', bar: 'bg-purple-500', step: 5,  unit: 'g' },
    { label: 'Agua',           value: water,   set: setWater,   goal: NUTRITION_GOALS.water,   icon: '💧', color: 'text-cyan-400',   bar: 'bg-cyan-500',   step: 1,  unit: ' vasos' },
  ];

  return (
    <div className="p-5 pt-6">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-4">Nutrición</h1>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700/50 rounded-2xl p-1 mb-4">
        <button onClick={() => changeDate(-1)} className="p-2.5 hover:bg-slate-700 rounded-xl transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm capitalize">{dateLabel}</span>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className={`p-2.5 rounded-xl transition-all ${isToday ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-700'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calorie card */}
      <div className="bg-gradient-to-br from-orange-600/25 to-amber-600/25 border border-orange-500/25 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="font-semibold">Calorías estimadas</span>
          </div>
          <span className="font-bold text-orange-400">
            {calories} <span className="text-sm font-normal text-slate-400">/ {CAL_GOAL} kcal</span>
          </span>
        </div>
        <div className="h-2 bg-slate-800/60 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${calPct}%` }}
          />
        </div>
      </div>

      {/* Macros */}
      <div className="space-y-3 mb-4">
        {macros.map(({ label, value, set, goal, icon, color, bar, step, unit }) => {
          const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
          return (
            <div key={label} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{icon}</span>
                  <span className="font-semibold">{label}</span>
                </div>
                <div>
                  <span className={`font-bold ${color}`}>{value}</span>
                  <span className="text-slate-400 text-sm">/{goal}{unit}</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full mb-3">
                <div className={`h-full ${bar} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set(s => Math.max(0, s - step))}
                  className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={value}
                  onChange={e => set(Math.max(0, Number(e.target.value)))}
                  className="flex-1 bg-slate-900 rounded-xl px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinner"
                  min="0"
                />
                <button
                  onClick={() => set(s => s + step)}
                  className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full font-bold py-4 rounded-2xl transition-all shadow-lg ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
        }`}
      >
        {saved ? '✅ Guardado' : 'Guardar nutrición'}
      </button>
      <p className="text-center text-xs text-slate-500 mt-3">
        Objetivo: {NUTRITION_GOALS.protein}g proteína · {CAL_GOAL} kcal/día
      </p>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function ProgressView({ workoutLog, onNavigate }) {
  const totalWorkouts = Object.keys(workoutLog).filter(d => Object.keys(workoutLog[d]).length > 0).length;
  const now = new Date();
  const thisMonth = Object.keys(workoutLog).filter(date => {
    const d = new Date(date + 'T12:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      && Object.keys(workoutLog[date]).length > 0;
  }).length;
  const totalExercises = Object.values(workoutLog).reduce((a, d) => a + Object.keys(d).length, 0);

  const navCards = [
    { label: 'Gráficas de progreso', sub: 'Peso, volumen y 1RM', icon: TrendingUp,    color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   screen: 'charts'   },
    { label: 'Historial',            sub: 'Todos tus entrenamientos', icon: HistoryIcon, color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-slate-700/50',  screen: 'history'  },
    { label: 'Calendario',           sub: 'Vista mensual',       icon: Calendar,      color: 'text-emerald-400',bg: 'bg-emerald-500/15',border: 'border-slate-700/50',  screen: 'calendar' },
    { label: 'Fotos de progreso',    sub: 'Compara tu evolución',icon: Camera,        color: 'text-pink-400',   bg: 'bg-pink-500/15',   border: 'border-slate-700/50',  screen: 'photos'   },
    { label: 'Exportar / Importar',  sub: 'Backup de tus datos', icon: Download,      color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-slate-700/50',  screen: 'export'   },
  ];

  return (
    <div className="p-5 pt-6">
      <h1 className="text-2xl font-bold mb-5">Progreso</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: totalWorkouts, color: 'text-blue-400' },
          { label: 'Este mes', value: thisMonth, color: 'text-violet-400' },
          { label: 'Ejercicios', value: totalExercises, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="space-y-3">
        {navCards.map(({ label, sub, icon: Icon, color, bg, border, screen }) => (
          <button
            key={screen}
            onClick={() => onNavigate(screen)}
            className={`w-full bg-slate-800 border ${border} rounded-2xl p-4 flex items-center gap-4 hover:bg-slate-700/60 transition-all text-left`}
          >
            <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className="flex-1">
              <div className="font-bold">{label}</div>
              <div className="text-sm text-slate-400">{sub}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  );
}
