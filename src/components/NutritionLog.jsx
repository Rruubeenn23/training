import React, { useMemo, useState } from 'react';
import { ChevronLeft, Apple, Droplets, Check } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { getTodayDateKey, formatDateDisplay } from '../utils/dateUtils';

export default function NutritionLog({ onClose }) {
  const { nutrition, saveNutrition } = useAppData();
  const today = getTodayDateKey();
  const todayData = nutrition?.[today] || {};

  const [protein, setProtein] = useState(todayData.protein ?? '');
  const [carbs, setCarbs] = useState(todayData.carbs ?? '');
  const [fats, setFats] = useState(todayData.fats ?? '');
  const [water, setWater] = useState(todayData.water ?? '');
  const [notes, setNotes] = useState(todayData.notes ?? '');
  const [saved, setSaved] = useState(false);

  const recent = useMemo(() => {
    return Object.entries(nutrition || {})
      .sort(([a], [b]) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'))
      .slice(0, 7);
  }, [nutrition]);

  const handleSave = async () => {
    await saveNutrition(today, {
      protein: protein === '' ? 0 : parseFloat(protein),
      carbs: carbs === '' ? 0 : parseFloat(carbs),
      fats: fats === '' ? 0 : parseFloat(fats),
      water: water === '' ? 0 : parseFloat(water),
      notes: notes.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-5 pt-6 pb-24 max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Volver</span>
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-bold mb-1">Nutrición de hoy</h1>
          <p className="text-slate-400 text-sm">{formatDateDisplay(today)}</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-green-400" />
            <p className="text-sm text-slate-300 font-medium">Macronutrientes</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <InputField label="Proteína (g)" value={protein} onChange={setProtein} />
            <InputField label="Carbs (g)" value={carbs} onChange={setCarbs} />
            <InputField label="Grasas (g)" value={fats} onChange={setFats} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <p className="text-sm text-slate-300 font-medium">Hidratación</p>
          </div>
          <InputField label="Vasos de agua" value={water} onChange={setWater} />

          <div>
            <label className="block text-xs text-slate-400 mb-2">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Día alto en proteína"
              className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full mt-4 font-bold py-3.5 rounded-2xl transition-all ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700'
          }`}
        >
          {saved ? (
            <span className="inline-flex items-center gap-2">
              <Check className="w-4 h-4" /> Guardado
            </span>
          ) : (
            'Guardar nutrición'
          )}
        </button>

        {recent.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Últimos días</p>
            <div className="space-y-2">
              {recent.map(([date, n]) => (
                <div key={date} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{formatDateDisplay(date)}</p>
                    <p className="text-sm text-slate-300">
                      P {n.protein || 0}g · C {n.carbs || 0}g · G {n.fats || 0}g
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{n.water || 0} vasos</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min="0"
        step="0.1"
        className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
