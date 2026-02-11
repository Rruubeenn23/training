import React, { useState } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Share2, CheckCircle } from 'lucide-react';
import { exportAllData, importData } from '../utils/storageHelper';

export default function ExportData({ onClose, onImportSuccess }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  const downloadJSON = async () => {
    setStatus('processing');
    setMessage('Exportando datos...');

    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      setMessage('✅ Datos exportados correctamente');
    } catch (error) {
      setStatus('error');
      setMessage('❌ Error al exportar datos');
    }
  };

  const downloadCSV = async () => {
    setStatus('processing');
    setMessage('Generando CSV...');

    try {
      const data = await exportAllData();
      
      // Convert workout logs to CSV
      const rows = [['Fecha', 'Ejercicio', 'Serie', 'Peso', 'Reps']];
      
      Object.entries(data.workoutLogs).forEach(([date, exercises]) => {
        Object.entries(exercises).forEach(([exerciseName, sets]) => {
          Object.entries(sets).forEach(([setNum, setData]) => {
            rows.push([
              date,
              exerciseName,
              setNum,
              setData.weight || '',
              setData.reps || ''
            ]);
          });
        });
      });

      const csv = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      setMessage('✅ CSV generado correctamente');
    } catch (error) {
      setStatus('error');
      setMessage('❌ Error al generar CSV');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('processing');
    setMessage('Importando datos...');

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const success = await importData(data);
      
      if (success) {
        setStatus('success');
        setMessage('✅ Datos importados correctamente');
        
        // Reload the app after import
        setTimeout(() => {
          onImportSuccess && onImportSuccess();
        }, 1500);
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Error al importar. Verifica el archivo.');
    }
  };

  const shareData = async () => {
    if (!navigator.share) {
      setStatus('error');
      setMessage('Tu navegador no soporta compartir');
      return;
    }

    setStatus('processing');
    setMessage('Preparando datos...');

    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], `training-backup-${new Date().toISOString().split('T')[0]}.json`, {
        type: 'application/json'
      });

      await navigator.share({
        title: 'Training Tracker Backup',
        text: 'Backup de mis datos de entrenamiento',
        files: [file]
      });

      setStatus('success');
      setMessage('✅ Compartido exitosamente');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus('error');
        setMessage('❌ Error al compartir');
      } else {
        setStatus(null);
        setMessage('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Download className="w-8 h-8" />
          Exportar / Importar
        </h1>
        <p className="text-gray-400">Respalda o restaura tus datos</p>
      </div>

      {/* Status message */}
      {status && (
        <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 ${
          status === 'success' 
            ? 'bg-green-500/20 border border-green-500' 
            : status === 'error'
            ? 'bg-red-500/20 border border-red-500'
            : 'bg-blue-500/20 border border-blue-500'
        }`}>
          {status === 'success' && <CheckCircle className="w-6 h-6 text-green-400" />}
          {status === 'processing' && (
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          <p className={
            status === 'success' ? 'text-green-100' : 
            status === 'error' ? 'text-red-100' : 
            'text-blue-100'
          }>
            {message}
          </p>
        </div>
      )}

      {/* Export section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">📤 Exportar datos</h2>
        
        <div className="space-y-3">
          <button
            onClick={downloadJSON}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold py-4 px-4 rounded-xl transition-all flex items-center gap-3"
          >
            <FileJson className="w-6 h-6" />
            <div className="flex-1 text-left">
              <div>Descargar JSON (completo)</div>
              <div className="text-sm text-blue-200">Incluye todos tus datos</div>
            </div>
          </button>

          <button
            onClick={downloadCSV}
            className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-semibold py-4 px-4 rounded-xl transition-all flex items-center gap-3"
          >
            <FileSpreadsheet className="w-6 h-6" />
            <div className="flex-1 text-left">
              <div>Descargar CSV (entrenamientos)</div>
              <div className="text-sm text-green-200">Para Excel o Google Sheets</div>
            </div>
          </button>

          {navigator.share && (
            <button
              onClick={shareData}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-semibold py-4 px-4 rounded-xl transition-all flex items-center gap-3"
            >
              <Share2 className="w-6 h-6" />
              <div className="flex-1 text-left">
                <div>Compartir backup</div>
                <div className="text-sm text-purple-200">Envíalo por email o nube</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Import section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">📥 Importar datos</h2>
        
        <label className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-4 px-4 rounded-xl transition-all flex items-center gap-3 cursor-pointer">
          <Upload className="w-6 h-6" />
          <div className="flex-1 text-left">
            <div>Restaurar desde JSON</div>
            <div className="text-sm text-orange-200">Recupera un backup anterior</div>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2">💡 Sobre el backup:</p>
          <ul className="space-y-1 text-gray-300 ml-4 list-disc">
            <li>JSON contiene TODOS tus datos (entrenamientos, nutrición, fotos, sensaciones)</li>
            <li>CSV solo contiene entrenamientos (útil para análisis externo)</li>
            <li>Haz backups regulares para no perder tu progreso</li>
            <li>Guarda los backups en Google Drive, iCloud o similar</li>
          </ul>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2">⚠️ Al importar:</p>
          <ul className="space-y-1 text-gray-300 ml-4 list-disc">
            <li>Se sobrescribirán los datos actuales</li>
            <li>No se puede deshacer</li>
            <li>Haz un backup antes de importar</li>
          </ul>
        </div>

        <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2">✅ Recomendaciones:</p>
          <ul className="space-y-1 text-gray-300 ml-4 list-disc">
            <li>Exporta cada semana o mes</li>
            <li>Guarda múltiples copias en diferentes lugares</li>
            <li>Renombra los backups con la fecha</li>
            <li>Verifica que el archivo JSON sea válido antes de importar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}