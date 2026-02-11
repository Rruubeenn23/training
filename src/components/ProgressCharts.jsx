import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Activity, Dumbbell, ChevronDown } from 'lucide-react';
import { getExerciseHistory, getAllExercises } from '../utils/storageHelper';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProgressCharts({ workoutLogs, onClose }) {
  const [selectedExercise, setSelectedExercise] = useState('');
  const [exercises, setExercises] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const allExercises = getAllExercises(workoutLogs);
    setExercises(allExercises);
    if (allExercises.length > 0 && !selectedExercise) {
      setSelectedExercise(allExercises[0]);
    }
  }, [workoutLogs]);

  useEffect(() => {
    if (selectedExercise) {
      const history = getExerciseHistory(workoutLogs, selectedExercise);
      
      // Format data for charts
      const formattedData = history.map(entry => ({
        date: format(new Date(entry.date), 'dd MMM', { locale: es }),
        fullDate: entry.date,
        peso: entry.maxWeight,
        reps: entry.repsAtMax,
        volumen: Math.round(entry.volume),
        rm: Math.round(entry.estimated1RM * 10) / 10
      }));

      setChartData(formattedData);

      // Calculate stats
      if (formattedData.length > 0) {
        const first = formattedData[0];
        const last = formattedData[formattedData.length - 1];
        
        setStats({
          sessions: formattedData.length,
          maxWeight: Math.max(...formattedData.map(d => d.peso)),
          maxVolume: Math.max(...formattedData.map(d => d.volumen)),
          current1RM: last.rm,
          weightProgress: last.peso - first.peso,
          rmProgress: last.rm - first.rm
        });
      }
    }
  }, [selectedExercise, workoutLogs]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-white mb-2">{data.fullDate}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {entry.dataKey === 'peso' || entry.dataKey === 'rm' ? 'kg' : entry.dataKey === 'reps' ? 'reps' : 'kg·reps'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
          ← Volver
        </button>
        <div className="text-center py-20">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No hay datos suficientes para mostrar gráficas.</p>
          <p className="text-gray-500 text-sm mt-2">Registra algunos entrenamientos primero.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Progreso por ejercicio
        </h1>
        <p className="text-gray-400">Visualiza tu evolución en cada ejercicio</p>
      </div>

      {/* Exercise selector */}
      <div className="relative mb-6">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-4 rounded-xl transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-blue-400" />
            {selectedExercise || 'Selecciona un ejercicio'}
          </span>
          <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-10">
            {exercises.map((exercise) => (
              <button
                key={exercise}
                onClick={() => {
                  setSelectedExercise(exercise);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors ${
                  selectedExercise === exercise ? 'bg-slate-700 text-blue-400' : 'text-white'
                }`}
              >
                {exercise}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4">
            <div className="text-3xl font-bold">{stats.maxWeight} kg</div>
            <div className="text-sm text-blue-200">Peso máximo</div>
            {stats.weightProgress !== 0 && (
              <div className={`text-xs mt-1 ${stats.weightProgress > 0 ? 'text-green-300' : 'text-red-300'}`}>
                {stats.weightProgress > 0 ? '+' : ''}{stats.weightProgress} kg
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-4">
            <div className="text-3xl font-bold">{stats.current1RM} kg</div>
            <div className="text-sm text-purple-200">1RM estimado</div>
            {stats.rmProgress !== 0 && (
              <div className={`text-xs mt-1 ${stats.rmProgress > 0 ? 'text-green-300' : 'text-red-300'}`}>
                {stats.rmProgress > 0 ? '+' : ''}{Math.round(stats.rmProgress * 10) / 10} kg
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-4">
            <div className="text-3xl font-bold">{stats.maxVolume}</div>
            <div className="text-sm text-green-200">Volumen máximo</div>
            <div className="text-xs text-green-300 mt-1">kg × reps</div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-4">
            <div className="text-3xl font-bold">{stats.sessions}</div>
            <div className="text-sm text-orange-200">Sesiones</div>
            <div className="text-xs text-orange-300 mt-1">registradas</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="space-y-6">
          {/* Weight progression */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <h3 className="font-bold mb-4 text-lg">Progresión de peso</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="peso" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Peso"
                />
                <Line 
                  type="monotone" 
                  dataKey="rm" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  name="1RM"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Volume progression */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <h3 className="font-bold mb-4 text-lg">Volumen por sesión</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  label={{ value: 'kg·reps', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="volumen" 
                  fill="#10b981"
                  name="Volumen"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No hay suficientes datos para este ejercicio</p>
          <p className="text-gray-500 text-sm mt-1">Registra al menos 2 sesiones</p>
        </div>
      )}
    </div>
  );
}