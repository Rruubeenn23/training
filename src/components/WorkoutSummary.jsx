import React from 'react';
import { ChevronLeft, Trophy, Zap, Clock, Dumbbell, Brain, TrendingUp } from 'lucide-react';
import { calculateWorkoutVolume, calculateWorkoutDuration } from '../utils/progressionEngine';

export default function WorkoutSummary({ workoutData, metadata, newPRs, onClose, onAnalyzeWithAI }) {
  const exercises = Object.keys(workoutData || {});
  const totalSets = Object.values(workoutData || {}).reduce((a, sets) => a + Object.keys(sets).length, 0);
  const volume = calculateWorkoutVolume(workoutData || {});
  const duration = metadata?.duration || calculateWorkoutDuration(workoutData || {}) || '—';

  const prList = Object.entries(newPRs || {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-5 pt-6 pb-24">
        <button onClick={onClose} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Volver</span>
        </button>

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-6 mb-5 text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-2xl font-bold mb-1">¡Entrenamiento completado!</h1>
          <p className="text-emerald-100 text-sm">
            {metadata?.title || 'Sesión de entrenamiento'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Ejercicios</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{exercises.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">{totalSets} series totales</div>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Volumen</span>
            </div>
            <div className="text-2xl font-bold text-violet-400">{volume.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">kg totales</div>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Duración</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{duration}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Records</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{prList.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">PRs nuevos</div>
          </div>
        </div>

        {/* PRs */}
        {prList.length > 0 && (
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 border border-amber-500/30 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-amber-300">Records personales</span>
            </div>
            <div className="space-y-2">
              {prList.map(([exercise, pr]) => (
                <div key={exercise} className="flex items-center justify-between">
                  <span className="text-sm text-white">{exercise}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-400">
                      {pr.newRecord.weight}kg × {pr.newRecord.reps} reps
                    </span>
                    {pr.type === 'weight' && (
                      <div className="text-xs text-amber-500">
                        Antes: {pr.previousRecord?.weight ?? '—'}kg
                      </div>
                    )}
                    {pr.type === '1rm' && (
                      <div className="text-xs text-amber-500">
                        1RM: {pr.newRecord.estimated1RM}kg
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise summary */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 mb-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Ejercicios completados</p>
          <div className="space-y-2">
            {exercises.map(exName => {
              const sets = workoutData[exName];
              const setCount = Object.keys(sets).length;
              const maxWeight = Math.max(...Object.values(sets).map(s => parseFloat(s.weight || 0)));
              return (
                <div key={exName} className="flex items-center justify-between py-1">
                  <span className="text-sm text-white">{exName}</span>
                  <span className="text-xs text-slate-400">
                    {setCount} series · max {maxWeight}kg
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analyze with AI */}
        {onAnalyzeWithAI && (
          <button
            onClick={onAnalyzeWithAI}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Brain className="w-5 h-5" />
            Analizar con Coach IA
          </button>
        )}
      </div>
    </div>
  );
}
