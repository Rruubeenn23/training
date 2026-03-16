import React from 'react';
import { Home, Dumbbell, Brain, TrendingUp, User } from 'lucide-react';

const TABS = [
  { id: 'home', icon: Home, label: 'Inicio' },
  { id: 'training', icon: Dumbbell, label: 'Entreno' },
  { id: 'coach', icon: Brain, label: 'Coach IA' },
  { id: 'progress', icon: TrendingUp, label: 'Progreso' },
  { id: 'profile', icon: User, label: 'Perfil' },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-safe">
      <div className="max-w-lg mx-auto px-3 pb-3">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl flex items-center justify-around">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2.5 min-w-0 flex-1 transition-all ${
                active ? 'text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={22} className={active ? 'scale-110' : ''} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium truncate ${active ? 'text-cyan-300' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
