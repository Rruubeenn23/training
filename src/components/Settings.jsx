import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, CheckCircle, AlertCircle, Loader, RefreshCw, ChevronLeft } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/storageHelper';
import { initSupabase, syncToSupabase, loadFromSupabase, isSupabaseConfigured } from '../utils/database';
import { exportAllData } from '../utils/storageHelper';

export default function Settings({ onBack, onSupabaseConfigured }) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSupabaseConfig();
  }, []);

  const loadSupabaseConfig = async () => {
    const settings = await getSettings();
    if (settings.supabaseUrl) {
      setSupabaseUrl(settings.supabaseUrl);
    }
    if (settings.supabaseKey) {
      setSupabaseKey(settings.supabaseKey);
    }
    if (settings.supabaseUrl && settings.supabaseKey) {
      const client = initSupabase(settings.supabaseUrl, settings.supabaseKey);
      setIsConnected(client !== null);
    }
  };

  const handleConnect = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setError('Por favor ingresa URL y API key');
      return;
    }

    setError('');
    const client = initSupabase(supabaseUrl, supabaseKey);

    if (!client) {
      setError('Error al conectar. Verifica tus credenciales.');
      return;
    }

    // Guardar configuración
    const settings = await getSettings();
    settings.supabaseUrl = supabaseUrl;
    settings.supabaseKey = supabaseKey;
    await saveSettings(settings);

    setIsConnected(true);
    setSyncStatus({ type: 'success', message: '✅ Conectado a Supabase - Auto-sync activado' });

    // Llamar callback para que App.jsx reinicialize
    if (onSupabaseConfigured) {
      onSupabaseConfigured();
    }
  };

  const handleManualSync = async () => {
    if (!isConnected) {
      setError('Primero debes conectar con Supabase');
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: 'Sincronizando manualmente...' });

    try {
      const localData = await exportAllData();
      const results = await syncToSupabase(localData);

      const total = results.workouts.success + results.feelings.success + results.nutrition.success;
      const errors = results.workouts.errors + results.feelings.errors + results.nutrition.errors;

      if (errors > 0) {
        setSyncStatus({
          type: 'warning',
          message: `⚠️ Sincronizado con errores: ${total} exitosos, ${errors} fallidos`
        });
      } else {
        setSyncStatus({
          type: 'success',
          message: `✅ Sincronizado manualmente: ${total} registros actualizados`
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus({
        type: 'error',
        message: `❌ Error: ${error.message}`
      });
    }

    setIsSyncing(false);
  };

  const handleLoadFromCloud = async () => {
    if (!isConnected) {
      setError('Primero debes conectar con Supabase');
      return;
    }

    if (!confirm('¿Cargar datos desde la nube? Esto combinará los datos de la nube con tus datos locales.')) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: 'Descargando desde la nube...' });

    try {
      const cloudData = await loadFromSupabase();
      
      // Guardar en local
      if (cloudData.workoutLogs) {
        await window.storage.set('workout-logs', JSON.stringify(cloudData.workoutLogs));
      }
      if (cloudData.workoutMetadata) {
        await window.storage.set('workout-metadata', JSON.stringify(cloudData.workoutMetadata));
      }
      if (cloudData.feelings) {
        await window.storage.set('daily-feelings', JSON.stringify(cloudData.feelings));
      }
      if (cloudData.nutrition) {
        await window.storage.set('nutrition-logs', JSON.stringify(cloudData.nutrition));
      }

      const totalRecords = Object.keys(cloudData.workoutLogs || {}).length +
                          Object.keys(cloudData.feelings || {}).length +
                          Object.keys(cloudData.nutrition || {}).length;

      setSyncStatus({
        type: 'success',
        message: `✅ Descargado: ${totalRecords} registros desde la nube. Recarga la página.`
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Load error:', error);
      setSyncStatus({
        type: 'error',
        message: `❌ Error: ${error.message}`
      });
    }

    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5 pb-24">
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mb-5 pt-2 transition-colors">
        <ChevronLeft className="w-5 h-5" /><span className="font-medium">Volver</span>
      </button>

      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <SettingsIcon className="w-8 h-8" />
        Configuración
      </h1>

      {/* Supabase Configuration */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold">Base de datos (Supabase)</h2>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="font-semibold text-green-400">Conectado a Supabase</p>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                URL: {supabaseUrl.substring(0, 30)}...
              </p>
              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 mt-3">
                <p className="text-sm text-blue-300 font-semibold mb-2">🚀 Auto-sync ACTIVO</p>
                <p className="text-xs text-gray-300">
                  Cada vez que registres un entrenamiento, sensación o nutrición, se guardará automáticamente en la nube. No necesitas sincronizar manualmente.
                </p>
              </div>
            </div>

            {/* Manual sync options (por si acaso) */}
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Opciones manuales (normalmente no necesarias):</p>
              
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`w-full font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isSyncing
                    ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                }`}
              >
                {isSyncing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Forzar sincronización completa
                  </>
                )}
              </button>

              <button
                onClick={handleLoadFromCloud}
                disabled={isSyncing}
                className={`w-full font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isSyncing
                    ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                }`}
              >
                {isSyncing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    Descargar desde la nube
                  </>
                )}
              </button>
            </div>

            {syncStatus && (
              <div className={`rounded-xl p-4 ${
                syncStatus.type === 'success' ? 'bg-green-500/20 border border-green-500' :
                syncStatus.type === 'error' ? 'bg-red-500/20 border border-red-500' :
                syncStatus.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500' :
                'bg-blue-500/20 border border-blue-500'
              }`}>
                <p className={`text-sm ${
                  syncStatus.type === 'success' ? 'text-green-100' :
                  syncStatus.type === 'error' ? 'text-red-100' :
                  syncStatus.type === 'warning' ? 'text-yellow-100' :
                  'text-blue-100'
                }`}>
                  {syncStatus.message}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-4">
              <p className="text-yellow-400 text-sm">
                No conectado. Configura Supabase para backup automático en la nube.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-100 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Project URL:
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxx.supabase.co"
                  className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Anon/Public Key:
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold mb-2">📝 Configuración rápida:</p>
              <ol className="list-decimal ml-4 space-y-1 text-gray-300">
                <li>Ve a <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">supabase.com</a></li>
                <li>Crea proyecto gratis</li>
                <li>SQL Editor → Ejecuta el schema (ver documentación)</li>
                <li>Settings → API → Copia URL y anon key</li>
                <li>Pégalas aquí arriba</li>
              </ol>
            </div>

            <button
              onClick={handleConnect}
              disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
              className={`w-full font-semibold py-3 rounded-xl transition-all ${
                supabaseUrl.trim() && supabaseKey.trim()
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                  : 'bg-slate-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Conectar a Supabase
            </button>
          </>
        )}
      </div>

      {/* About */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Acerca de</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p><strong>Versión:</strong> 3.0.0</p>
          <p><strong>Desarrollado para:</strong> Rubén</p>
          <p className="pt-4 text-gray-400">
            Training Tracker - App profesional de seguimiento de entrenamientos con IA gratuita (Groq), gráficas, nutrición, backup automático en la nube (Supabase) y más.
          </p>
        </div>
      </div>

      {/* Features list */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-sm text-gray-300">
        <p className="font-semibold mb-2">✨ Características:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li><strong>NUEVO:</strong> Auto-sync automático con Supabase</li>
          <li><strong>NUEVO:</strong> Carga automática desde la nube al iniciar</li>
          <li><strong>ARREGLADO:</strong> Fechas correctas sin desfase de 1 día</li>
          <li>Importación desde Motra con fechas correctas</li>
          <li>IA gratuita con Groq (Llama 3.3)</li>
          <li>Calendario visual mejorado</li>
          <li>Historial con búsqueda y filtros</li>
          <li>Gráficas de progreso interactivas</li>
          <li>Tracking de nutrición</li>
          <li>Fotos de progreso con comparación</li>
          <li>Exportar/Importar datos</li>
          <li>PWA instalable en iPhone</li>
        </ul>
      </div>

      {/* Auto-sync explanation */}
      <div className="mt-6 bg-green-500/10 border border-green-500/50 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2 text-green-300">🚀 Cómo funciona el Auto-sync:</p>
        <ul className="space-y-1 text-gray-300 ml-4 list-disc">
          <li>Al iniciar la app, se cargan automáticamente tus datos desde Supabase</li>
          <li>Cada vez que registras un entrenamiento, se sube instantáneamente a la nube</li>
          <li>Lo mismo con sensaciones y nutrición - todo se sincroniza automáticamente</li>
          <li>No necesitas dar a ningún botón de sincronizar</li>
          <li>Tus datos están siempre respaldados y accesibles desde cualquier dispositivo</li>
        </ul>
      </div>
    </div>
  );
}