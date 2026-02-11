import React, { useState, useEffect } from 'react';
import { Apple, Flame, Droplet, TrendingUp, Plus, Save } from 'lucide-react';
import { getNutritionLogs, saveNutritionLog, getSettings } from '../utils/storageHelper';

export default function NutritionTracker({ onClose }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [nutrition, setNutrition] = useState({
    protein: 0,
    carbs: 0,
    fats: 0,
    water: 0
  });
  const [goals, setGoals] = useState({
    protein: 170,
    calories: 2200
  });
  const [allLogs, setAllLogs] = useState({});
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealData, setMealData] = useState({ protein: '', carbs: '', fats: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (allLogs[date]) {
      setNutrition(allLogs[date]);
    } else {
      setNutrition({ protein: 0, carbs: 0, fats: 0, water: 0 });
    }
  }, [date, allLogs]);

  const loadData = async () => {
    const logs = await getNutritionLogs();
    const settings = await getSettings();
    
    setAllLogs(logs);
    setGoals({
      protein: settings.proteinGoal || 170,
      calories: settings.calorieGoal || 2200
    });
  };

  const saveData = async () => {
    await saveNutritionLog(date, nutrition);
    setAllLogs(prev => ({ ...prev, [date]: nutrition }));
  };

  const addMeal = () => {
    const protein = parseFloat(mealData.protein) || 0;
    const carbs = parseFloat(mealData.carbs) || 0;
    const fats = parseFloat(mealData.fats) || 0;

    setNutrition(prev => ({
      ...prev,
      protein: prev.protein + protein,
      carbs: prev.carbs + carbs,
      fats: prev.fats + fats
    }));

    setMealData({ protein: '', carbs: '', fats: '' });
    setShowAddMeal(false);
  };

  const addWater = () => {
    setNutrition(prev => ({
      ...prev,
      water: prev.water + 0.5
    }));
  };

  const calories = nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fats * 9;
  const proteinProgress = (nutrition.protein / goals.protein) * 100;
  const calorieProgress = (calories / goals.calories) * 100;

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Stats for the week
  const getWeekStats = () => {
    const today = new Date(date);
    const weekDates = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      weekDates.push(d.toISOString().split('T')[0]);
    }

    const weekLogs = weekDates
      .map(d => allLogs[d])
      .filter(Boolean);

    if (weekLogs.length === 0) return null;

    const avgProtein = weekLogs.reduce((sum, log) => sum + log.protein, 0) / weekLogs.length;
    const avgCalories = weekLogs.reduce((sum, log) => {
      return sum + (log.protein * 4 + log.carbs * 4 + log.fats * 9);
    }, 0) / weekLogs.length;

    return {
      avgProtein: Math.round(avgProtein),
      avgCalories: Math.round(avgCalories),
      daysTracked: weekLogs.length
    };
  };

  const weekStats = getWeekStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Apple className="w-8 h-8" />
          Nutrición
        </h1>
        <p className="text-gray-400">Registra tus macros y calorías diarias</p>
      </div>

      {/* Date selector */}
      <div className="mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Calories */}
        <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-4">
          <Flame className="w-6 h-6 mb-2 text-orange-200" />
          <div className="text-3xl font-bold">{Math.round(calories)}</div>
          <div className="text-sm text-orange-200 mb-2">/ {goals.calories} kcal</div>
          <div className="w-full bg-orange-900/30 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getProgressColor(calorieProgress)}`}
              style={{ width: `${Math.min(calorieProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Protein */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4">
          <Apple className="w-6 h-6 mb-2 text-blue-200" />
          <div className="text-3xl font-bold">{Math.round(nutrition.protein)}</div>
          <div className="text-sm text-blue-200 mb-2">/ {goals.protein}g proteína</div>
          <div className="w-full bg-blue-900/30 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getProgressColor(proteinProgress)}`}
              style={{ width: `${Math.min(proteinProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Water */}
        <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl p-4">
          <Droplet className="w-6 h-6 mb-2 text-cyan-200" />
          <div className="text-3xl font-bold">{nutrition.water}L</div>
          <div className="text-sm text-cyan-200">agua hoy</div>
          <button
            onClick={addWater}
            className="mt-2 w-full bg-cyan-700 hover:bg-cyan-600 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            + 500ml
          </button>
        </div>

        {/* Macros breakdown */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="text-sm text-gray-400 mb-3">Macros</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-400">Proteína:</span>
              <span className="font-semibold">{Math.round(nutrition.protein)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Carbos:</span>
              <span className="font-semibold">{Math.round(nutrition.carbs)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">Grasas:</span>
              <span className="font-semibold">{Math.round(nutrition.fats)}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week stats */}
      {weekStats && (
        <div className="bg-slate-800 rounded-2xl p-4 mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Promedio últimos 7 días
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">{weekStats.avgProtein}g</div>
              <div className="text-xs text-gray-400">Proteína/día</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{weekStats.avgCalories}</div>
              <div className="text-xs text-gray-400">Calorías/día</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{weekStats.daysTracked}</div>
              <div className="text-xs text-gray-400">Días seguidos</div>
            </div>
          </div>
        </div>
      )}

      {/* Add meal button */}
      {!showAddMeal ? (
        <button
          onClick={() => setShowAddMeal(true)}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-5 h-5" />
          Añadir comida
        </button>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-4">Registrar comida</h3>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Proteína (g)</label>
              <input
                type="number"
                value={mealData.protein}
                onChange={(e) => setMealData(prev => ({ ...prev, protein: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Carbohidratos (g)</label>
              <input
                type="number"
                value={mealData.carbs}
                onChange={(e) => setMealData(prev => ({ ...prev, carbs: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Grasas (g)</label>
              <input
                type="number"
                value={mealData.fats}
                onChange={(e) => setMealData(prev => ({ ...prev, fats: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddMeal(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={addMeal}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={saveData}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        Guardar día
      </button>

      {/* Tips */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2">💡 Tips para recomposición:</p>
        <ul className="space-y-1 text-gray-300 ml-4 list-disc">
          <li>Apunta a {goals.protein}g de proteína diaria</li>
          <li>Mantén déficit moderado ({goals.calories} kcal)</li>
          <li>Prioriza proteína en todas las comidas</li>
          <li>Hidratación: mínimo 2.5-3L al día</li>
        </ul>
      </div>
    </div>
  );
}