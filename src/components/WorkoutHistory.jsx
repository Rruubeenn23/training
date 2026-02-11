import React, { useState, useEffect } from 'react';
import { History, Search, Filter, TrendingUp, Calendar, Dumbbell, Clock, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { getWorkoutLogs, getWorkoutMetadata } from '../utils/storageHelper';

export default function WorkoutHistory({ onClose }) {
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [metadata, setMetadata] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', 'week', 'month', '3months'
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'volume'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const logs = await getWorkoutLogs();
    const meta = await getWorkoutMetadata();
    setWorkoutLogs(logs);
    setMetadata(meta);
  };

  const toggleExpanded = (date) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const getFilteredWorkouts = () => {
    let dates = Object.keys(workoutLogs).filter(date => 
      Object.keys(workoutLogs[date]).length > 0
    );

    // Filter by period
    const now = new Date();
    if (filterPeriod !== 'all') {
      dates = dates.filter(date => {
        const workoutDate = new Date(date);
        const diffTime = now - workoutDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (filterPeriod === 'week') return diffDays <= 7;
        if (filterPeriod === 'month') return diffDays <= 30;
        if (filterPeriod === '3months') return diffDays <= 90;
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      dates = dates.filter(date => {
        const exercises = Object.keys(workoutLogs[date]);
        const meta = metadata[date];
        
        return exercises.some(ex => ex.toLowerCase().includes(searchTerm.toLowerCase())) ||
               meta?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               date.includes(searchTerm);
      });
    }

    // Sort
    dates.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b) - new Date(a);
      if (sortBy === 'date-asc') return new Date(a) - new Date(b);
      if (sortBy === 'volume') {
        const volumeA = metadata[a]?.volume || '0';
        const volumeB = metadata[b]?.volume || '0';
        const numA = parseFloat(volumeA.replace(/[^\d.]/g, ''));
        const numB = parseFloat(volumeB.replace(/[^\d.]/g, ''));
        return numB - numA;
      }
      return 0;
    });

    return dates;
  };

  const calculateStats = (dates) => {
    const totalExercises = dates.reduce((acc, date) => {
      return acc + Object.keys(workoutLogs[date]).length;
    }, 0);

    const totalSets = dates.reduce((acc, date) => {
      return acc + Object.values(workoutLogs[date]).reduce((setAcc, sets) => {
        return setAcc + Object.keys(sets).length;
      }, 0);
    }, 0);

    const avgExercisesPerWorkout = dates.length > 0 ? 
      (totalExercises / dates.length).toFixed(1) : 0;

    return {
      totalWorkouts: dates.length,
      totalExercises,
      totalSets,
      avgExercisesPerWorkout
    };
  };

  const filteredDates = getFilteredWorkouts();
  const stats = calculateStats(filteredDates);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <History className="w-8 h-8" />
          Historial de entrenamientos
        </h1>
        <p className="text-gray-400">Explora y analiza tus sesiones pasadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4">
          <div className="text-3xl font-bold">{stats.totalWorkouts}</div>
          <div className="text-sm text-blue-200">Entrenamientos</div>
          <div className="text-xs text-blue-300 mt-1">{stats.totalExercises} ejercicios</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-4">
          <div className="text-3xl font-bold">{stats.avgExercisesPerWorkout}</div>
          <div className="text-sm text-purple-200">Ejercicios/sesión</div>
          <div className="text-xs text-purple-300 mt-1">{stats.totalSets} series totales</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar ejercicio o fecha..."
            className="w-full bg-slate-900 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-slate-900 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Todo el tiempo</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="3months">Últimos 3 meses</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="date-desc">Más reciente</option>
            <option value="date-asc">Más antiguo</option>
            <option value="volume">Por volumen</option>
          </select>
        </div>

        <div className="text-xs text-gray-400">
          {filteredDates.length} entrenamiento{filteredDates.length !== 1 ? 's' : ''} encontrado{filteredDates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Workout list */}
      {filteredDates.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">
            {searchTerm || filterPeriod !== 'all' 
              ? 'No se encontraron entrenamientos con estos filtros'
              : 'No hay entrenamientos registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDates.map(date => {
            const exercises = workoutLogs[date];
            const meta = metadata[date];
            const exerciseCount = Object.keys(exercises).length;
            const isExpanded = expandedDates.has(date);

            return (
              <div key={date} className="bg-slate-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleExpanded(date)}
                  className="w-full p-4 hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isExpanded ? 'bg-blue-600' : 'bg-slate-700'
                      } transition-colors`}>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg">
                          {new Date(date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </p>
                        <p className="text-sm text-gray-400">
                          {meta?.title || `${exerciseCount} ejercicio${exerciseCount !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {meta?.duration && (
                        <div className="flex items-center gap-1 text-sm text-blue-400">
                          <Clock className="w-4 h-4" />
                          {meta.duration}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex gap-3 text-xs">
                    {meta?.volume && (
                      <span className="flex items-center gap-1 text-green-400">
                        <Zap className="w-3 h-3" />
                        {meta.volume}
                      </span>
                    )}
                    {meta?.calories && (
                      <span className="text-orange-400">
                        🔥 {meta.calories}
                      </span>
                    )}
                    <span className="text-gray-500">
                      {exerciseCount} ejercicio{exerciseCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4 space-y-3">
                    {Object.entries(exercises).map(([exerciseName, sets]) => (
                      <div key={exerciseName} className="bg-slate-900 rounded-xl p-3">
                        <h4 className="font-semibold mb-2 text-sm">{exerciseName}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(sets).map(([setNum, setData]) => (
                            <div 
                              key={setNum} 
                              className="flex items-center justify-between text-xs bg-slate-800 rounded-lg p-2"
                            >
                              <span className="text-gray-400">Serie {setNum}</span>
                              <span className="font-semibold">
                                {setData.weight && `${setData.weight} kg`}
                                {setData.weight && setData.reps && ' × '}
                                {setData.reps && `${setData.reps}${setData.type === 'time' ? '' : ' reps'}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      {filteredDates.length > 0 && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2">💡 Consejos:</p>
          <ul className="space-y-1 text-gray-300 ml-4 list-disc">
            <li>Usa la búsqueda para encontrar ejercicios específicos</li>
            <li>Filtra por período para ver tu progreso reciente</li>
            <li>Toca un entrenamiento para ver todos los detalles</li>
            <li>Ordena por volumen para ver tus mejores sesiones</li>
          </ul>
        </div>
      )}
    </div>
  );
}