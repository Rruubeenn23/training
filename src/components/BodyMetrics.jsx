import React, { useState } from 'react';
import { ChevronLeft, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getTodayDateKey } from '../utils/dateUtils';

export default function BodyMetrics({ bodyMetrics, onSave, onClose }) {
  const entries = bodyMetrics?.entries || [];
  const today = getTodayDateKey();
  const todayEntry = entries.find(e => e.date === today);

  const [weight, setWeight] = useState(todayEntry?.weight ?? '');
  const [waist, setWaist] = useState(todayEntry?.waistCm ?? '');
  const [notes, setNotes] = useState(todayEntry?.notes ?? '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!weight) return;
    onSave({
      date: today,
      weight: parseFloat(weight),
      waistCm: waist ? parseFloat(waist) : null,
      notes: notes.trim()
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Chart data — last 30 weight entries
  const chartData = entries
    .filter(e => e.weight)
    .slice(-30)
    .map(e => ({
      date: e.date.slice(5), // MM-DD
      weight: e.weight
    }));

  // Stats
  const last = entries.filter(e => e.weight).slice(-1)[0];
  const prev = entries.filter(e => e.weight).slice(-2, -1)[0];
  const weightChange = last && prev ? (last.weight - prev.weight) : null;
  const first = entries.filter(e => e.weight)[0];
  const totalChange = last && first && first !== last ? (last.weight - first.weight) : null;

  const TrendIcon = weightChange === null ? Minus : weightChange < 0 ? TrendingDown : TrendingUp;
  const trendColor = weightChange === null ? 'text-slate-400' : weightChange < 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-5 pt-6 pb-24">
        <button onClick={onClose} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Volver</span>
        </button>

        <h1 className="text-2xl font-bold mb-1">Métricas Corporales</h1>
        <p className="text-slate-400 text-sm mb-5">Registra tu peso y medidas</p>

        {/* Stats row */}
        {last && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-1">Peso actual</div>
              <div className="text-xl font-bold text-blue-400">{last.weight} kg</div>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-1">Desde ayer</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` : '—'}
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-1">Total</div>
              <div className={`text-xl font-bold ${totalChange !== null && totalChange < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}` : '—'}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 mb-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Tendencia de peso</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#60a5fa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Input form */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 mb-5">
          <p className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-400" />
            Registrar hoy
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Peso corporal (kg) *</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="ej: 95.5"
                step="0.1"
                min="30"
                max="300"
                className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinner"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Cintura (cm) <span className="text-slate-600">opcional</span></label>
              <input
                type="number"
                value={waist}
                onChange={e => setWaist(e.target.value)}
                placeholder="ej: 90"
                step="0.5"
                min="40"
                max="200"
                className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinner"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Notas <span className="text-slate-600">opcional</span></label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ej: Después de desayuno"
                className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!weight}
            className={`w-full mt-4 font-bold py-3.5 rounded-2xl transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : weight
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saved ? '✅ Guardado' : 'Guardar medición'}
          </button>
        </div>

        {/* History */}
        {entries.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Historial</p>
            <div className="space-y-2">
              {[...entries].reverse().slice(0, 20).map((entry, idx) => (
                <div key={idx} className="bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    {entry.notes && <p className="text-xs text-slate-500 mt-0.5">{entry.notes}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">{entry.weight} kg</span>
                    {entry.waistCm && <p className="text-xs text-slate-400">Cintura: {entry.waistCm} cm</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
