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
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2.5 min-w-0 flex-1 transition-all ${
                active ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={22} className={active ? 'scale-110' : ''} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium truncate ${active ? 'text-blue-400' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
