import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, SkipForward } from 'lucide-react';

const PRESETS = [60, 90, 120, 180];

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

export default function RestTimer({ isVisible, defaultDuration = 90, onDismiss }) {
  const [duration, setDuration] = useState(defaultDuration);
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef(null);

  // Auto-start when shown
  useEffect(() => {
    if (isVisible) {
      setDuration(defaultDuration);
      setTimeLeft(defaultDuration);
      setIsRunning(true);
      setIsDone(false);
    } else {
      clearInterval(intervalRef.current);
      setIsRunning(false);
    }
  }, [isVisible, defaultDuration]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsDone(true);
            playBeep();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const changePreset = useCallback((newDuration) => {
    clearInterval(intervalRef.current);
    setDuration(newDuration);
    setTimeLeft(newDuration);
    setIsRunning(true);
    setIsDone(false);
  }, []);

  const adjust = (delta) => {
    setTimeLeft(t => Math.max(5, t + delta));
    if (isDone) setIsDone(false);
    if (!isRunning && timeLeft > 0) setIsRunning(true);
  };

  const togglePause = () => {
    if (isDone) {
      setTimeLeft(duration);
      setIsDone(false);
      setIsRunning(true);
    } else {
      setIsRunning(r => !r);
    }
  };

  const handleDismiss = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const progress = duration > 0 ? timeLeft / duration : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className={`rounded-2xl p-4 shadow-2xl border transition-all ${
        isDone
          ? 'bg-emerald-900 border-emerald-500/50'
          : 'bg-slate-800 border-slate-600/50'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isDone ? '✅ Descanso completado' : 'Descanso'}
          </span>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-slate-700 transition-all text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative flex-shrink-0">
            <svg width="88" height="88" className="-rotate-90">
              <circle
                cx="44" cy="44" r={radius}
                fill="none" strokeWidth="4"
                stroke={isDone ? '#059669' : '#1e293b'}
              />
              <circle
                cx="44" cy="44" r={radius}
                fill="none" strokeWidth="4"
                stroke={isDone ? '#10b981' : '#3b82f6'}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold tabular-nums ${isDone ? 'text-emerald-400' : 'text-white'}`}>
                {isDone ? '✓' : timeStr}
              </span>
            </div>
          </div>

          <div className="flex-1">
            {/* Adjust buttons */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => adjust(-15)}
                className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-slate-300"
              >
                -15s
              </button>
              <button
                onClick={togglePause}
                className={`flex-1 py-1.5 rounded-lg transition-all font-semibold text-sm ${
                  isDone
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isDone ? <SkipForward className="w-4 h-4 mx-auto" /> : isRunning ? <Pause className="w-4 h-4 mx-auto" /> : <Play className="w-4 h-4 mx-auto" />}
              </button>
              <button
                onClick={() => adjust(15)}
                className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-slate-300"
              >
                +15s
              </button>
            </div>

            {/* Presets */}
            <div className="flex gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => changePreset(p)}
                  className={`flex-1 text-xs py-1 rounded-lg transition-all ${
                    duration === p && !isDone
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                  }`}
                >
                  {p < 60 ? `${p}s` : `${p / 60}m`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
