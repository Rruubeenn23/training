import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { parseMotraWorkout, convertToInternalFormat, extractWorkoutMetadata, isValidMotraWorkout } from '../utils/motraParser';
import { saveWorkoutLogs, saveWorkoutMetadata, getWorkoutLogs } from '../utils/storageHelper';

export default function WorkoutParser({ onSuccess, onClose }) {
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoDetectedDate, setAutoDetectedDate] = useState(null);

  const handleParse = async () => {
    if (!inputText.trim()) {
      setStatus('error');
      setMessage('Por favor pega el texto de tu entrenamiento');
      return;
    }

    setIsProcessing(true);
    setStatus(null);

    try {
      if (!isValidMotraWorkout(inputText)) {
        setStatus('error');
        setMessage('El texto no parece ser de Motra. Asegúrate de copiar todo el entrenamiento.');
        setIsProcessing(false);
        return;
      }

      const parsed = parseMotraWorkout(inputText);
      
      if (parsed.exercises.length === 0) {
        setStatus('error');
        setMessage('No se encontraron ejercicios. Verifica el formato del texto.');
        setIsProcessing(false);
        return;
      }

      setParsedData(parsed);

      // Auto-detect date from parsed data
      if (parsed.date) {
        const detectedDate = parseDateFromMotra(parsed.date);
        if (detectedDate) {
          setAutoDetectedDate(detectedDate);
          setSelectedDate(detectedDate);
        }
      }

      setStatus('preview');
      setMessage(`✅ Entrenamiento parseado: ${parsed.exercises.length} ejercicios encontrados`);

    } catch (error) {
      console.error('Error parsing workout:', error);
      setStatus('error');
      setMessage('Error al procesar el entrenamiento. Intenta de nuevo.');
    }

    setIsProcessing(false);
  };

  const handleSave = async () => {
    if (!parsedData) return;

    setIsProcessing(true);

    try {
      // Convert to internal format but use selected date
      const internalFormat = convertToInternalFormat(parsedData);
      
      // Replace the auto-generated date key with selected date
      const originalDateKey = Object.keys(internalFormat)[0];
      const workoutData = internalFormat[originalDateKey];
      
      const newFormat = {
        [selectedDate]: workoutData
      };

      // Merge with existing logs
      const existingLogs = await getWorkoutLogs();
      const mergedLogs = {
        ...existingLogs,
        ...newFormat
      };

      // Save
      await saveWorkoutLogs(mergedLogs);
      
      // Save metadata
      const metadata = extractWorkoutMetadata(parsedData);
      await saveWorkoutMetadata(selectedDate, metadata);

      setStatus('success');
      setMessage(`✅ ¡Entrenamiento guardado en ${formatDate(selectedDate)}!`);
      
      setTimeout(() => {
        onSuccess && onSuccess(mergedLogs);
      }, 1500);

    } catch (error) {
      console.error('Error saving workout:', error);
      setStatus('error');
      setMessage('Error al guardar el entrenamiento. Intenta de nuevo.');
    }

    setIsProcessing(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
      setStatus(null);
      setMessage('');
    } catch (error) {
      setMessage('No se pudo pegar. Copia manualmente el texto.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseDateFromMotra = (dateText) => {
    // Example: "11 feb 2026, 18:36" or "11 feb 2026"
    try {
      const match = dateText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (!match) return null;

      const [_, day, month, year] = match;
      const monthMap = {
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
      };

      const monthNum = monthMap[month.toLowerCase()];
      if (monthNum === undefined) return null;

      const date = new Date(parseInt(year), monthNum, parseInt(day));
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button 
        onClick={onClose} 
        className="mb-6 text-blue-400 hover:text-blue-300 transition-colors"
      >
        ← Volver
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-2xl mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Importar entrenamiento</h1>
          </div>
          <p className="text-blue-100 text-sm">
            Pega el texto de tu entrenamiento desde Motra
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Cómo funciona:
          </h3>
          <ol className="text-sm text-gray-300 space-y-1 ml-6 list-decimal">
            <li>Abre tu entrenamiento en Motra</li>
            <li>Toca "Compartir" y copia el texto completo</li>
            <li>Pégalo aquí abajo</li>
            <li>Verifica la fecha y guarda</li>
          </ol>
        </div>

        {/* Input area */}
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pega aquí tu entrenamiento...&#10;&#10;Ejemplo:&#10;Mi entrenamiento:&#10;Miércoles Noche Piernas...&#10;11 feb 2026, 18:36&#10;DURACIÓN: 1h 16m&#10;Sentadilla con Barra&#10;1: 12 repeticiones x 45 kg&#10;..."
            className="w-full h-64 bg-slate-900 text-white rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={handlePaste}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
            >
              📋 Pegar del portapapeles
            </button>
            
            <button
              onClick={handleParse}
              disabled={isProcessing || !inputText.trim()}
              className={`flex-1 font-semibold py-3 rounded-xl transition-all ${
                isProcessing || !inputText.trim()
                  ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Procesando...
                </span>
              ) : (
                '🔍 Analizar entrenamiento'
              )}
            </button>
          </div>
        </div>

        {/* Status message */}
        {status && status !== 'preview' && (
          <div className={`rounded-xl p-4 flex items-start gap-3 mb-4 ${
            status === 'success' 
              ? 'bg-green-500/20 border border-green-500' 
              : 'bg-red-500/20 border border-red-500'
          }`}>
            {status === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={status === 'success' ? 'text-green-100' : 'text-red-100'}>
              {message}
            </p>
          </div>
        )}

        {/* Preview and date selection */}
        {parsedData && status === 'preview' && (
          <div className="space-y-4">
            {/* Date selector */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                Selecciona la fecha del entrenamiento
              </h3>
              
              {autoDetectedDate && (
                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 mb-3 text-sm">
                  <p className="text-blue-300">
                    📅 Fecha detectada: <strong>{formatDate(autoDetectedDate)}</strong>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm text-gray-400">
                  Fecha del entrenamiento:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Por defecto: {formatDate(selectedDate)}
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <h3 className="font-bold mb-3">Vista previa del entrenamiento:</h3>
              
              <div className="bg-slate-900 rounded-xl p-4 mb-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {parsedData.duration && (
                    <div>
                      <span className="text-gray-400">Duración:</span>
                      <p className="font-semibold">{parsedData.duration}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Ejercicios:</span>
                    <p className="font-semibold">{parsedData.exercises.length}</p>
                  </div>
                  {parsedData.volume && (
                    <div>
                      <span className="text-gray-400">Volumen:</span>
                      <p className="font-semibold">{parsedData.volume}</p>
                    </div>
                  )}
                  {parsedData.calories && (
                    <div>
                      <span className="text-gray-400">Calorías:</span>
                      <p className="font-semibold">{parsedData.calories}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedData.exercises.map((exercise, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-3">
                    <p className="font-semibold text-sm mb-1">{exercise.name}</p>
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {exercise.sets.map((set, setIdx) => (
                        <div key={setIdx} className="flex items-center gap-2">
                          <span className="text-blue-400">Serie {set.setNumber}:</span>
                          <span>
                            {set.type === 'time' ? (
                              `${set.duration} ${set.weight ? `× ${set.weight}` : ''}`
                            ) : (
                              `${set.reps} reps ${set.weight ? `× ${set.weight}` : ''}`
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setParsedData(null);
                  setStatus(null);
                  setAutoDetectedDate(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 rounded-xl transition-all"
              >
                ← Editar texto
              </button>

              <button
                onClick={handleSave}
                disabled={isProcessing}
                className={`flex-1 font-semibold py-4 rounded-xl transition-all ${
                  isProcessing
                    ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Guardando...
                  </span>
                ) : (
                  '✅ Guardar entrenamiento'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}