import React, { useState, useRef } from 'react';
import {
  Dumbbell, Plus, Check, Minus, ChevronDown, ChevronUp,
  Trophy, Timer, Target, Edit3, Save, X, Brain,
  Play, Square, Clock
} from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { getTodayDateKey, getCurrentDayKey } from '../../utils/dateUtils';
import { calculateWorkoutVolume, calculateWorkoutDuration } from '../../utils/progressionEngine';
import RestTimer from '../RestTimer';
import WorkoutSummary from '../WorkoutSummary';

const DAY_NAMES = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

export default function TrainingTab({ onNavigateToCoach }) {
  const {
    workoutLog, trainingPlan, progressionTargets,
    personalRecords, handleSetSaved, saveFeeling,
    saveWorkout, userSettings,
  } = useAppData();

  const today = getTodayDateKey();
  const todayDay = getCurrentDayKey();
  const todayPlan = trainingPlan?.plan?.days?.[todayDay] || trainingPlan?.plan?.[todayDay];
  const existingWorkout = workoutLog[today] || {};

  const [activeWorkout, setActiveWorkout] = useState(existingWorkout);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [workoutStarted, setWorkoutStarted] = useState(Object.keys(existingWorkout).length > 0);
  const [sessionPRs, setSessionPRs] = useState({});
  const [prToast, setPrToast] = useState(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const prToastTimeout = useRef(null);

  const showPrToast = (name, weight, reps) => {
    clearTimeout(prToastTimeout.current);
    setPrToast({ name, weight, reps });
    prToastTimeout.current = setTimeout(() => setPrToast(null), 4000);
  };

  const getSetCount = (exName) => {
    return Object.keys(activeWorkout[exName] || {}).length;
  };

  const getLastSet = (exName) => {
    const sets = activeWorkout[exName] || {};
    const keys = Object.keys(sets);
    if (keys.length === 0) return null;
    return sets[keys[keys.length - 1]];
  };

  const addSet = async (exName, weight, reps) => {
    const currentSets = activeWorkout[exName] || {};
    const setNumber = Object.keys(currentSets).length + 1;
    const newLog = {
      ...activeWorkout,
      [exName]: {
        ...currentSets,
        [setNumber]: {
          weight: parseFloat(weight) || 0,
          reps: parseInt(reps) || 0,
          timestamp: new Date().toISOString(),
        },
      },
    };
    setActiveWorkout(newLog);
    if (userSettings?.auto_rest_timer !== false) setShowTimer(true);

    // PR check
    const result = await handleSetSaved(exName, parseFloat(weight) || 0, parseInt(reps) || 0, today, { [today]: newLog });
    if (result?.isPR) {
      setSessionPRs(prev => ({ ...prev, [exName]: result.prResult }));
      showPrToast(exName, weight, reps);
    }
  };

  const removeLastSet = (exName) => {
    const sets = { ...(activeWorkout[exName] || {}) };
    const keys = Object.keys(sets);
    if (keys.length === 0) return;
    delete sets[keys[keys.length - 1]];
    const newLog = { ...activeWorkout, [exName]: sets };
    setActiveWorkout(newLog);
    handleSetSaved(exName, 0, 0, today, { [today]: newLog });
  };

  const finishWorkout = () => {
    const volume = calculateWorkoutVolume(activeWorkout);
    const duration = calculateWorkoutDuration(activeWorkout);
    const metadata = {
      title: todayPlan?.name || todayPlan?.focus || 'Entrenamiento libre',
      volume: `${volume} kg`,
      duration: duration || null,
      notes: sessionNotes.trim() || null,
      date: new Date().toISOString(),
    };
    saveWorkout(today, activeWorkout, metadata);
    setSummaryData({ workoutData: activeWorkout, newPRs: sessionPRs, metadata });
    setShowSummary(true);
  };

  const addCustomExercise = () => {
    const name = newExName.trim();
    if (!name) return;
    setActiveWorkout(prev => ({ ...prev, [name]: {} }));
    setExpandedExercise(name);
    setNewExName('');
    setAddingExercise(false);
    setWorkoutStarted(true);
  };

  // Get exercises from plan + any already logged
  const planExercises = (todayPlan?.exercises || []).map(e => e.name);
  const loggedExercises = Object.keys(activeWorkout);
  const allExercises = [...new Set([...planExercises, ...loggedExercises])];

  if (showSummary && summaryData) {
    return (
      <WorkoutSummary
        workoutData={summaryData.workoutData}
        metadata={summaryData.metadata}
        newPRs={summaryData.newPRs}
        onClose={() => setShowSummary(false)}
        onAnalyzeWithAI={(prefill) => { setShowSummary(false); onNavigateToCoach?.(prefill); }}
      />
    );
  }

  return (
    <div className="pb-24 max-w-lg mx-auto">
      {/* PR Toast */}
      {prToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce-in">
          <Trophy size={18} />
          ¡PR! {prToast.name} — {prToast.weight}kg × {prToast.reps}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {todayPlan ? (todayPlan.name || todayPlan.focus) : 'Entrenamiento libre'}
            </h2>
            <p className="text-slate-400 text-sm">{DAY_NAMES[todayDay]} · {today}</p>
          </div>
          {workoutStarted && (
            <button
              onClick={finishWorkout}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-all"
            >
              <Check size={16} /> Terminar
            </button>
          )}
        </div>

        {/* Plan description */}
        {todayPlan?.focus && (
          <div className="mt-2 text-xs text-slate-500 bg-slate-800/40 rounded-xl px-3 py-2">
            Foco: <span className="text-slate-300">{todayPlan.focus}</span>
          </div>
        )}
      </div>

      {/* No plan state */}
      {!todayPlan && allExercises.length === 0 && (
        <div className="mx-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center mb-4">
          <Brain size={32} className="mx-auto mb-3 text-purple-400" />
          <p className="text-white font-semibold mb-1">Sin plan para hoy</p>
          <p className="text-slate-400 text-sm mb-4">Pide al Coach IA que cree tu rutina o añade ejercicios manualmente</p>
          <button
            onClick={() => onNavigateToCoach?.()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            Abrir Coach IA
          </button>
        </div>
      )}

      {/* Exercises */}
      <div className="px-4 space-y-3">
        {/* Session notes */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-2">Notas de la sesión (opcional)</p>
          <input
            type="text"
            value={sessionNotes}
            onChange={e => setSessionNotes(e.target.value)}
            placeholder="Ej: buena energía, hombro sensible..."
            className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {allExercises.map(exName => (
          <ExerciseCard
            key={exName}
            name={exName}
            planInfo={todayPlan?.exercises?.find(e => e.name === exName)}
            sets={activeWorkout[exName] || {}}
            progressionTarget={progressionTargets[exName]}
            personalRecord={personalRecords[exName]}
            isExpanded={expandedExercise === exName}
            onToggle={() => setExpandedExercise(prev => prev === exName ? null : exName)}
            onAddSet={(w, r) => { addSet(exName, w, r); setWorkoutStarted(true); }}
            onRemoveSet={() => removeLastSet(exName)}
            isPR={!!sessionPRs[exName]}
          />
        ))}

        {/* Add exercise */}
        {addingExercise ? (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
            <p className="text-sm font-medium text-slate-300 mb-3">Nombre del ejercicio</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExName}
                onChange={e => setNewExName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomExercise()}
                placeholder="Ej: Press banca"
                autoFocus
                className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={addCustomExercise} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl">
                <Plus size={18} />
              </button>
              <button onClick={() => setAddingExercise(false)} className="bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl">
                <X size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingExercise(true)}
            className="w-full border border-dashed border-slate-600 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            <Plus size={18} /> Añadir ejercicio
          </button>
        )}
      </div>

      {/* Rest Timer */}
      <RestTimer
        isVisible={showTimer}
        defaultDuration={userSettings?.rest_timer_duration || 90}
        onDismiss={() => setShowTimer(false)}
      />
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({ name, planInfo, sets, progressionTarget, personalRecord, isExpanded, onToggle, onAddSet, onRemoveSet, isPR }) {
  const [weight, setWeight] = useState(
    progressionTarget?.currentTargetWeight
    || personalRecord?.bestWeight?.weight
    || ''
  );
  const [reps, setReps] = useState(planInfo?.reps?.split('-')[0] || '10');
  const setCount = Object.keys(sets).length;
  const targetSets = planInfo?.sets || 3;

  return (
    <div className={`bg-slate-800/60 border rounded-2xl overflow-hidden transition-all ${
      isPR ? 'border-yellow-500/40' : isExpanded ? 'border-blue-500/30' : 'border-slate-700/50'
    }`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            setCount >= targetSets ? 'bg-green-500/20' : 'bg-slate-700'
          }`}>
            {setCount >= targetSets
              ? <Check size={16} className="text-green-400" />
              : <Dumbbell size={16} className="text-slate-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{name}</span>
              {isPR && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full">PR 🏆</span>}
              {progressionTarget?.readyToProgress && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">⬆️ Sube peso</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {setCount}/{targetSets} series
              {planInfo?.reps ? ` · ${planInfo.reps} reps` : ''}
              {planInfo?.rest_seconds ? ` · ${planInfo.rest_seconds}s descanso` : ''}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
          {/* Previous sets */}
          {Object.entries(sets).length > 0 && (
            <div className="space-y-1.5">
              {Object.entries(sets).map(([setNum, data]) => (
                <div key={setNum} className="flex items-center gap-2 text-sm bg-slate-700/30 rounded-xl px-3 py-2">
                  <span className="text-slate-500 w-6">S{setNum}</span>
                  <span className="text-white font-medium">{data.weight}kg</span>
                  <span className="text-slate-400">×</span>
                  <span className="text-white">{data.reps} reps</span>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Peso (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Reps</label>
              <input
                type="number"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => onAddSet(weight, reps)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex-shrink-0"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Weight quick adjustments */}
          <div className="flex gap-2">
            {[-2.5, -1.25, +1.25, +2.5].map(delta => (
              <button
                key={delta}
                onClick={() => setWeight(prev => Math.max(0, (parseFloat(prev) || 0) + delta).toString())}
                className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded-lg transition-all"
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>

          {/* Remove last set */}
          {Object.keys(sets).length > 0 && (
            <button
              onClick={onRemoveSet}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1.5 transition-colors"
            >
              <Minus size={14} /> Quitar última serie
            </button>
          )}

          {/* Plan notes */}
          {planInfo?.notes && (
            <p className="text-xs text-slate-500 italic bg-slate-700/20 rounded-xl px-3 py-2">
              💡 {planInfo.notes}
            </p>
          )}

          {/* PR info */}
          {personalRecord && (
            <p className="text-xs text-slate-500">
              PR actual: <span className="text-yellow-400 font-medium">
                {personalRecord.bestWeight?.weight}kg × {personalRecord.bestWeight?.reps} reps
                {personalRecord.best1RM?.estimated1RM ? ` (1RM ~${personalRecord.best1RM.estimated1RM.toFixed(0)}kg)` : ''}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
