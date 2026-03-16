import React, { useState } from 'react';
import {
  User, LogOut, Settings, Brain, Key, Edit3, Save,
  Scale, Target, Activity, ChevronRight, Trash2,
  Moon, Sun, Bell, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import BodyMetrics from '../components/BodyMetrics';
import ExportData from '../components/ExportData';

export default function ProfilePage() {
  const { user, displayName, profile, signOut } = useAuth();
  const { aiMemory, bodyMetrics, userSettings, saveSettings, saveBodyMetric } = useAppData();
  const [screen, setScreen] = useState(null); // null | 'body' | 'export' | 'settings'
  const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || '');
  const [editingKey, setEditingKey] = useState(false);

  const handleSaveApiKey = () => {
    localStorage.setItem('groq_api_key', apiKey.trim());
    setEditingKey(false);
  };

  const handleSignOut = async () => {
    if (confirm('¿Cerrar sesión?')) await signOut();
  };

  if (screen === 'body') {
    return (
      <BodyMetrics
        bodyMetrics={bodyMetrics}
        onSave={saveBodyMetric}
        onClose={() => setScreen(null)}
      />
    );
  }

  if (screen === 'export') {
    return <ExportData onClose={() => setScreen(null)} />;
  }

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto space-y-4">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-white">
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{displayName}</p>
          <p className="text-slate-400 text-sm truncate">{user?.email}</p>
          {aiMemory?.profile_facts?.experience_level && (
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full mt-1 inline-block">
              {aiMemory.profile_facts.experience_level}
            </span>
          )}
        </div>
      </div>

      {/* AI Memory Summary */}
      {aiMemory?.profile_facts && Object.keys(aiMemory.profile_facts).length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Perfil IA</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {aiMemory.profile_facts.goal && (
              <div className="bg-slate-700/30 rounded-xl px-3 py-2">
                <p className="text-slate-500 text-xs">Objetivo</p>
                <p className="text-white font-medium capitalize">{aiMemory.profile_facts.goal.replace('_', ' ')}</p>
              </div>
            )}
            {aiMemory.profile_facts.available_days && (
              <div className="bg-slate-700/30 rounded-xl px-3 py-2">
                <p className="text-slate-500 text-xs">Días/semana</p>
                <p className="text-white font-medium">{aiMemory.profile_facts.available_days}</p>
              </div>
            )}
            {aiMemory.profile_facts.weight_kg && (
              <div className="bg-slate-700/30 rounded-xl px-3 py-2">
                <p className="text-slate-500 text-xs">Peso inicio</p>
                <p className="text-white font-medium">{aiMemory.profile_facts.weight_kg} kg</p>
              </div>
            )}
            {aiMemory.profile_facts.height_cm && (
              <div className="bg-slate-700/30 rounded-xl px-3 py-2">
                <p className="text-slate-500 text-xs">Altura</p>
                <p className="text-white font-medium">{aiMemory.profile_facts.height_cm} cm</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-2">
        <MenuItem
          icon={<Scale size={18} className="text-purple-400" />}
          label="Métricas corporales"
          sub={`${(bodyMetrics?.entries || []).length} registros`}
          onClick={() => setScreen('body')}
        />
        <MenuItem
          icon={<Download size={18} className="text-blue-400" />}
          label="Exportar datos"
          sub="CSV, JSON"
          onClick={() => setScreen('export')}
        />
      </div>

      {/* API Key */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-yellow-400" />
            <span className="text-sm font-semibold text-white">Groq API Key</span>
          </div>
          {!editingKey && (
            <button onClick={() => setEditingKey(true)} className="text-blue-400 text-xs hover:text-blue-300">
              Editar
            </button>
          )}
        </div>
        {editingKey ? (
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <button
              onClick={handleSaveApiKey}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded-xl text-sm"
            >
              <Save size={16} />
            </button>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            {apiKey ? `${apiKey.slice(0, 6)}${'•'.repeat(20)}` : 'No configurada'}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Preferencias</p>
        <ToggleSetting
          label="Temporizador de descanso"
          sub="Iniciar automáticamente tras cada serie"
          value={userSettings?.auto_rest_timer !== false}
          onChange={v => saveSettings({ auto_rest_timer: v })}
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Duración de descanso</p>
            <p className="text-xs text-slate-500">En segundos (ej: 90)</p>
          </div>
          <input
            type="number"
            min="30"
            max="300"
            value={userSettings?.rest_timer_duration ?? 90}
            onChange={e => saveSettings({ rest_timer_duration: parseInt(e.target.value || '90') })}
            className="w-20 bg-slate-700 text-white rounded-lg px-2 py-1 text-sm text-center"
          />
        </div>
        <ToggleSetting
          label="Notificaciones"
          sub="Recordatorios de entrenamiento"
          value={userSettings?.notifications !== false}
          onChange={v => saveSettings({ notifications: v })}
        />
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl py-3 transition-all"
      >
        <LogOut size={18} /> Cerrar sesión
      </button>
    </div>
  );
}

function MenuItem({ icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 rounded-2xl p-4 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm">{label}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
      <ChevronRight size={16} className="text-slate-500" />
    </button>
  );
}

function ToggleSetting({ label, sub, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{label}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-all flex items-center ${
          value ? 'bg-blue-600 justify-end' : 'bg-slate-600 justify-start'
        }`}
      >
        <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow-sm" />
      </button>
    </div>
  );
}
