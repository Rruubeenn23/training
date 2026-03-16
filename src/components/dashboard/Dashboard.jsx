import React, { useState } from 'react';
import {
  Flame, Trophy, Dumbbell, Brain, TrendingUp,
  Activity, Moon, Zap, ChevronRight, Calendar,
  Target, Scale, Apple, Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppData } from '../../contexts/AppDataContext';
import { getTodayDateKey, getCurrentDayKey } from '../../utils/dateUtils';

const DAY_NAMES = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

export default function Dashboard({ onNavigate }) {
  const { displayName } = useAuth();
  const {
    workoutLog, trainingPlan, workoutStreak,
    personalRecords, bodyMetrics, feelings,
    nutrition, progressionTargets,
  } = useAppData();

  const today = getTodayDateKey();
  const todayDay = getCurrentDayKey();
  const todayWorkout = workoutLog[today] || {};
  const hasTodayWorkout = Object.keys(todayWorkout).length > 0;
  const todayFeeling = feelings[today];
  const todayNutrition = nutrition[today];

  // Today's plan
  const todayPlan = trainingPlan?.plan?.days?.[todayDay] || trainingPlan?.plan?.[todayDay];

  // Stats
  const totalWorkouts = Object.keys(workoutLog).filter(d => Object.keys(workoutLog[d]).length > 0).length;
  const prCount = Object.keys(personalRecords).length;
  const latestWeight = (bodyMetrics?.entries || []).slice(-1)[0]?.weight;

  // Ready to progress
  const readyToProgress = Object.entries(progressionTargets || {})
    .filter(([, t]) => t.readyToProgress)
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="pb-24 px-4 pt-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{greeting}</p>
          <h1 className="text-2xl font-bold text-white">{displayName} 👋</h1>
        </div>
        {workoutStreak.currentStreak >= 2 && (
          <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-2">
            <Flame size={18} className="text-orange-400" />
            <span className="text-orange-300 font-bold">{workoutStreak.currentStreak}</span>
          </div>
        )}
      </div>

      {/* Today's Workout Card */}
      <div
        className={`rounded-2xl p-4 cursor-pointer transition-all ${
          hasTodayWorkout
            ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30'
            : todayPlan
            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30'
            : 'bg-slate-800/60 border border-slate-700/50'
        }`}
        onClick={() => onNavigate('training')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              hasTodayWorkout ? 'bg-green-500/20' : 'bg-blue-500/20'
            }`}>
              <Dumbbell size={16} className={hasTodayWorkout ? 'text-green-400' : 'text-blue-400'} />
            </div>
            <span className="font-semibold text-white">Entrenamiento de hoy</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>

        {hasTodayWorkout ? (
          <div>
            <p className="text-green-400 text-sm font-medium mb-1">✅ Completado</p>
            <p className="text-slate-300 text-sm">
              {Object.keys(todayWorkout).slice(0, 3).join(', ')}
              {Object.keys(todayWorkout).length > 3 && ` +${Object.keys(todayWorkout).length - 3} más`}
            </p>
          </div>
        ) : todayPlan ? (
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1">{todayPlan.name || todayPlan.focus}</p>
            <p className="text-slate-400 text-sm">
              {(todayPlan.exercises || []).slice(0, 3).map(e => e.name).join(', ')}
              {(todayPlan.exercises || []).length > 3 && ` +${(todayPlan.exercises || []).length - 3} más`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm">No hay entrenamiento programado</p>
            <p className="text-slate-500 text-xs mt-1">Toca para registrar uno libre</p>
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Dumbbell size={18} className="text-blue-400" />} value={totalWorkouts} label="Entrenos" />
        <StatCard icon={<Trophy size={18} className="text-yellow-400" />} value={prCount} label="PRs" />
        <StatCard
          icon={<Scale size={18} className="text-purple-400" />}
          value={latestWeight ? `${latestWeight}kg` : '—'}
          label="Peso actual"
        />
      </div>

      {/* Feeling & Nutrition Quick Log */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLogCard
          icon={<Activity size={18} className="text-pink-400" />}
          title="Sensaciones"
          done={!!todayFeeling}
          doneText={`Energía ${todayFeeling?.energy}/10`}
          pendingText="Registrar cómo te sientes"
          onClick={() => onNavigate('feelings')}
        />
        <QuickLogCard
          icon={<Apple size={18} className="text-green-400" />}
          title="Nutrición"
          done={!!todayNutrition}
          doneText={todayNutrition?.protein ? `${todayNutrition.protein}g proteína` : 'Registrado'}
          pendingText="Registrar nutrición"
          onClick={() => onNavigate('nutrition')}
        />
      </div>

      {/* Ready to Progress */}
      {readyToProgress.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Listos para subir peso</span>
          </div>
          <div className="space-y-2">
            {readyToProgress.map(([ex, t]) => (
              <div key={ex} className="flex items-center justify-between text-sm">
                <span className="text-white font-medium truncate flex-1">{ex}</span>
                <span className="text-slate-400 ml-2 text-xs">{t.currentTargetWeight}kg · {t.sessionsAtCurrentWeight} sesiones</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach shortcut */}
      <button
        onClick={() => onNavigate('coach')}
        className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between hover:from-purple-600/30 hover:to-pink-600/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain size={20} className="text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Coach IA</p>
            <p className="text-slate-400 text-xs">Análisis y gestión de rutina</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </button>

      {/* Weekly overview */}
      <WeeklyOverview workoutLog={workoutLog} trainingPlan={trainingPlan} />
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-white font-bold text-lg leading-none">{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function QuickLogCard({ icon, title, done, doneText, pendingText, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 text-left transition-all border ${
        done
          ? 'bg-slate-800/60 border-slate-700/50'
          : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-300">{title}</span>
      </div>
      {done ? (
        <p className="text-green-400 text-sm font-medium">{doneText}</p>
      ) : (
        <p className="text-slate-500 text-xs">{pendingText}</p>
      )}
    </button>
  );
}

function WeeklyOverview({ workoutLog, trainingPlan }) {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const today = getCurrentDayKey();

  // Get dates for this week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const weekDates = days.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-300">Esta semana</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dateKey = weekDates[i];
          const hasWorkout = workoutLog[dateKey] && Object.keys(workoutLog[dateKey]).length > 0;
          const hasPlan = !!(trainingPlan?.plan?.days?.[day] || trainingPlan?.plan?.[day]);
          const isToday = day === today;

          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-medium ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>
                {DAY_NAMES[day].slice(0, 2)}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasWorkout
                  ? 'bg-green-500/20 border border-green-500/40'
                  : hasPlan
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : 'bg-slate-700/30 border border-slate-700/20'
              } ${isToday ? 'ring-2 ring-blue-500/50' : ''}`}>
                {hasWorkout ? (
                  <Dumbbell size={14} className="text-green-400" />
                ) : hasPlan ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
