import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { parseMotraWorkout, convertToInternalFormat, extractWorkoutMetadata, isValidMotraWorkout } from '../utils/motraParser';
import { saveWorkoutLogs, saveWorkoutMetadata, getWorkoutLogs } from '../utils/storageHelper';

export default function WorkoutParser({ onSuccess, onClose }) {
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleParse = async () => {
    if (!inputText.trim()) {
      setStatus('error');
      setMessage('Por favor pega el texto de tu entrenamiento');
      return;
    }

    setIsProcessing(true);
    setStatus(null);

    try {
      // Validar que sea un workout de Motra
      if (!isValidMotraWorkout(inputText)) {
        setStatus('error');
        setMessage('El texto no parece ser de Motra. Asegúrate de copiar todo el entrenamiento.');
        setIsProcessing(false);
        return;
      }

      // Parse el workout
      const parsed = parseMotraWorkout(inputText);
      
      if (parsed.exercises.length === 0) {
        setStatus('error');
        setMessage('No se encontraron ejercicios. Verifica el formato del texto.');
        setIsProcessing(false);
        return;
      }

      setParsedData(parsed);

      // Convertir al formato interno
      const internalFormat = convertToInternalFormat(parsed);
      
      // Merge con datos existentes
      const existingLogs = await getWorkoutLogs();
      const mergedLogs = {
        ...existingLogs,
        ...internalFormat
      };

      // Guardar
      await saveWorkoutLogs(mergedLogs);
      
      // Guardar metadata
      const metadata = extractWorkoutMetadata(parsed);
      const dateKey = Object.keys(internalFormat)[0];
      await saveWorkoutMetadata(dateKey, metadata);

      setStatus('success');
      setMessage(`✅ ¡Entrenamiento importado! ${parsed.exercises.length} ejercicios registrados.`);
      
      // Callback de éxito
      setTimeout(() => {
        onSuccess && onSuccess(mergedLogs);
      }, 1500);

    } catch (error) {
      console.error('Error parsing workout:', error);
      setStatus('error');
      setMessage('Error al procesar el entrenamiento. Intenta de nuevo.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
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
            <li>¡Listo! Se registrará automáticamente</li>
          </ol>
        </div>

        {/* Input area */}
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pega aquí tu entrenamiento...&#10;&#10;Ejemplo:&#10;Mi entrenamiento:&#10;Miércoles Noche Piernas...&#10;Sentadilla con Barra&#10;1: 12 repeticiones x 45 kg&#10;..."
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
                '🚀 Importar entrenamiento'
              )}
            </button>
          </div>
        </div>

        {/* Status message */}
        {status && (
          <div className={`rounded-xl p-4 flex items-start gap-3 ${
            status === 'success' 
              ? 'bg-green-500/20 border border-green-500' 
              : 'bg-red-500/20 border border-red-500'
          }`}>
            {status === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={status === 'success' ? 'text-green-100' : 'text-red-100'}>
                {message}
              </p>
              
              {parsedData && status === 'success' && (
                <div className="mt-3 text-sm space-y-1">
                  <p className="text-gray-300">📅 {parsedData.date}</p>
                  <p className="text-gray-300">⏱️ {parsedData.duration}</p>
                  <p className="text-gray-300">🏋️ {parsedData.exercises.length} ejercicios</p>
                  {parsedData.volume && (
                    <p className="text-gray-300">📊 Volumen: {parsedData.volume}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview parsed data */}
        {parsedData && status === 'success' && (
          <div className="mt-6 bg-slate-800 rounded-2xl p-4">
            <h3 className="font-bold mb-3">Vista previa:</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {parsedData.exercises.map((exercise, idx) => (
                <div key={idx} className="bg-slate-900 rounded-lg p-3">
                  <p className="font-semibold text-sm">{exercise.name}</p>
                  <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                    {exercise.sets.map((set, setIdx) => (
                      <div key={setIdx}>
                        Serie {set.setNumber}: {set.reps || set.duration} {set.weight && `× ${set.weight}`}
                      </div>
                    ))}
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