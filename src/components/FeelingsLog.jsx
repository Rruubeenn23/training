import React, { useMemo, useState } from 'react';
import { ChevronLeft, Activity, Moon, Zap, Check } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { getTodayDateKey, formatDateDisplay } from '../utils/dateUtils';

function Slider({ label, icon, value, onChange, colorClass }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorClass}/20`}>
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-sm text-slate-300 font-medium">{label}</p>
          <p className="text-xs text-slate-500">Nivel: {value}/10</p>
        </div>
        <span className={`text-lg font-bold ${colorClass}`}>{value}</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>Bajo</span>
        <span>Alto</span>
      </div>
    </div>
  );
}

export default function FeelingsLog({ onClose }) {
  const { feelings, saveFeeling } = useAppData();
  const today = getTodayDateKey();
  const todayData = feelings?.[today] || {};

  const [energy, setEnergy] = useState(todayData.energy ?? 7);
  const [sleep, setSleep] = useState(todayData.sleep ?? 7);
  const [motivation, setMotivation] = useState(todayData.motivation ?? 7);
  const [notes, setNotes] = useState(todayData.notes ?? '');
  const [saved, setSaved] = useState(false);

  const recent = useMemo(() => {
    return Object.entries(feelings || {})
      .sort(([a], [b]) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'))
      .slice(0, 7);
  }, [feelings]);
  const averages = useMemo(() => {
    if (recent.length === 0) return null;
    const sums = recent.reduce((acc, [, f]) => {
      acc.energy += f.energy || 0;
      acc.sleep += f.sleep || 0;
      acc.motivation += f.motivation || 0;
      return acc;
    }, { energy: 0, sleep: 0, motivation: 0 });
    return {
      energy: (sums.energy / recent.length).toFixed(1),
      sleep: (sums.sleep / recent.length).toFixed(1),
      motivation: (sums.motivation / recent.length).toFixed(1),
    };
  }, [recent]);

  const handleSave = async () => {
    await saveFeeling(today, { energy, sleep, motivation, notes: notes.trim() });
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
          <h1 className="text-2xl font-bold mb-1">Sensaciones de hoy</h1>
          <p className="text-slate-400 text-sm">{formatDateDisplay(today)}</p>
        </div>

        <div className="space-y-3">
          <Slider
            label="Energía"
            icon={<Activity className="w-4 h-4 text-pink-400" />}
            value={energy}
            onChange={setEnergy}
            colorClass="text-pink-400"
          />
          <Slider
            label="Sueño"
            icon={<Moon className="w-4 h-4 text-indigo-400" />}
            value={sleep}
            onChange={setSleep}
            colorClass="text-indigo-400"
          />
          <Slider
            label="Motivación"
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            value={motivation}
            onChange={setMotivation}
            colorClass="text-amber-400"
          />
        </div>

        {averages && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mt-4">
            <p className="text-xs text-slate-400 mb-2">Media últimos 7 días</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-700/40 rounded-xl py-2 text-sm">E {averages.energy}</div>
              <div className="bg-slate-700/40 rounded-xl py-2 text-sm">S {averages.sleep}</div>
              <div className="bg-slate-700/40 rounded-xl py-2 text-sm">M {averages.motivation}</div>
            </div>
          </div>
        )}

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mt-4">
          <label className="block text-xs text-slate-400 mb-2">Notas (opcional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Dormí poco, pero con ganas"
            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            'Guardar sensaciones'
          )}
        </button>

        {recent.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Últimos días</p>
            <div className="space-y-2">
              {recent.map(([date, f]) => (
                <div key={date} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{formatDateDisplay(date)}</p>
                    <p className="text-sm text-slate-300">
                      Energía {f.energy}/10 · Sueño {f.sleep}/10
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">Motivación {f.motivation}/10</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
