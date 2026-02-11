import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, Dumbbell, Clock, Zap, X } from 'lucide-react';
import { getWorkoutLogs, getWorkoutMetadata } from '../utils/storageHelper';

export default function EnhancedCalendar({ onClose, onSelectDay }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [metadata, setMetadata] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'list'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const logs = await getWorkoutLogs();
    const meta = await getWorkoutMetadata();
    setWorkoutLogs(logs);
    setMetadata(meta);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getDateKey = (year, month, day) => {
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const hasWorkout = (dateKey) => {
    return workoutLogs[dateKey] && Object.keys(workoutLogs[dateKey]).length > 0;
  };

  const getWorkoutCount = (dateKey) => {
    if (!workoutLogs[dateKey]) return 0;
    return Object.keys(workoutLogs[dateKey]).length;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    if (currentDate < new Date()) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dateKey) => {
    if (hasWorkout(dateKey)) {
      setSelectedDate(dateKey);
    }
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date().toISOString().split('T')[0];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = getDateKey(year, month, day);
      const isToday = dateKey === today;
      const hasWorkoutData = hasWorkout(dateKey);
      const exerciseCount = getWorkoutCount(dateKey);
      const isSelected = dateKey === selectedDate;
      const isFuture = new Date(dateKey) > new Date();

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(dateKey)}
          disabled={isFuture}
          className={`
            aspect-square p-1 rounded-xl transition-all relative
            ${isToday ? 'ring-2 ring-blue-500' : ''}
            ${hasWorkoutData ? 'bg-gradient-to-br from-green-600/30 to-emerald-600/30 hover:from-green-600/50 hover:to-emerald-600/50' : 'bg-slate-800/50 hover:bg-slate-700/50'}
            ${isSelected ? 'ring-2 ring-purple-500 scale-95' : ''}
            ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-400' : hasWorkoutData ? 'text-white' : 'text-gray-400'}`}>
              {day}
            </span>
            {hasWorkoutData && (
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: Math.min(exerciseCount, 3) }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-green-400" />
                ))}
                {exerciseCount > 3 && (
                  <span className="text-[8px] text-green-400 ml-0.5">+</span>
                )}
              </div>
            )}
          </div>
        </button>
      );
    }

    return days;
  };

  const renderWorkoutsList = () => {
    const workoutDates = Object.keys(workoutLogs)
      .filter(date => Object.keys(workoutLogs[date]).length > 0)
      .sort((a, b) => new Date(b) - new Date(a));

    if (workoutDates.length === 0) {
      return (
        <div className="text-center py-20">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No hay entrenamientos registrados</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {workoutDates.map(date => {
          const exercises = workoutLogs[date];
          const meta = metadata[date];
          const exerciseCount = Object.keys(exercises).length;
          
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className="w-full bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-lg">
                    {new Date(date).toLocaleDateString('es-ES', { 
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </p>
                  <p className="text-sm text-gray-400">
                    {exerciseCount} ejercicio{exerciseCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  {meta?.duration && (
                    <p className="text-sm text-blue-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {meta.duration}
                    </p>
                  )}
                  {meta?.volume && (
                    <p className="text-xs text-gray-500 mt-1">{meta.volume}</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {Object.keys(exercises).slice(0, 5).map((exercise, idx) => (
                  <span key={idx} className="text-xs bg-slate-700 px-2 py-1 rounded-lg">
                    {exercise.length > 20 ? exercise.substring(0, 20) + '...' : exercise}
                  </span>
                ))}
                {Object.keys(exercises).length > 5 && (
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded-lg text-gray-400">
                    +{Object.keys(exercises).length - 5}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderWorkoutDetail = () => {
    if (!selectedDate) return null;

    const exercises = workoutLogs[selectedDate];
    const meta = metadata[selectedDate];
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">
                {new Date(selectedDate).toLocaleDateString('es-ES', { 
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h2>
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-white/80 hover:text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {meta && (
              <div className="flex gap-4 text-sm text-purple-100">
                {meta.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {meta.duration}
                  </span>
                )}
                {meta.volume && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    {meta.volume}
                  </span>
                )}
                {meta.calories && (
                  <span className="flex items-center gap-1">
                    🔥 {meta.calories}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {Object.entries(exercises).map(([exerciseName, sets]) => (
              <div key={exerciseName} className="bg-slate-800 rounded-xl p-4">
                <h3 className="font-bold mb-3">{exerciseName}</h3>
                <div className="space-y-2">
                  {Object.entries(sets).map(([setNum, setData]) => (
                    <div key={setNum} className="flex items-center justify-between text-sm bg-slate-900 rounded-lg p-2">
                      <span className="text-gray-400">Serie {setNum}</span>
                      <span className="font-semibold">
                        {setData.weight && `${setData.weight} kg`}
                        {setData.weight && setData.reps && ' × '}
                        {setData.reps && `${setData.reps} ${setData.type === 'time' ? '' : 'reps'}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => {
                setSelectedDate(null);
                onSelectDay && onSelectDay(selectedDate);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Ver entrenamiento completo
            </button>
          </div>
        </div>
      </div>
    );
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const stats = {
    totalWorkouts: Object.keys(workoutLogs).filter(date => Object.keys(workoutLogs[date]).length > 0).length,
    totalExercises: Object.values(workoutLogs).reduce((acc, day) => acc + Object.keys(day).length, 0),
    thisMonth: Object.keys(workoutLogs).filter(date => {
      const d = new Date(date);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && Object.keys(workoutLogs[date]).length > 0;
    }).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <CalendarIcon className="w-8 h-8" />
          Calendario de entrenamientos
        </h1>
        <p className="text-gray-400">Visualiza tu historial y progreso</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold">{stats.totalWorkouts}</div>
          <div className="text-xs text-blue-200">Total</div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold">{stats.thisMonth}</div>
          <div className="text-xs text-purple-200">Este mes</div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold">{stats.totalExercises}</div>
          <div className="text-xs text-green-200">Ejercicios</div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('month')}
          className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
            viewMode === 'month' 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800 text-gray-400'
          }`}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
            viewMode === 'list' 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800 text-gray-400'
          }`}
        >
          📋 Lista
        </button>
      </div>

      {viewMode === 'month' ? (
        <>
          {/* Calendar navigation */}
          <div className="bg-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>
              
              <button
                onClick={nextMonth}
                disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
                className={`p-2 rounded-lg transition-colors ${
                  currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-slate-700'
                }`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm transition-all mb-4"
            >
              Ir a hoy
            </button>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs text-gray-400 font-semibold py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm">
            <p className="font-semibold mb-2">Leyenda:</p>
            <div className="space-y-1 text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-600/30 to-emerald-600/30" />
                <span>Día con entrenamiento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded ring-2 ring-blue-500" />
                <span>Hoy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-400" />
                <span>Cada punto = 1 ejercicio (máx 3 puntos)</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        renderWorkoutsList()
      )}

      {/* Workout detail modal */}
      {selectedDate && renderWorkoutDetail()}
    </div>
  );
}