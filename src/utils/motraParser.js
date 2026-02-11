/**
 * Parser para el formato de texto de Motra - CORREGIDO
 * Convierte el texto compartido en un objeto estructurado
 */

export function parseMotraWorkout(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  const workout = {
    title: '',
    date: '',
    duration: '',
    volume: '',
    calories: '',
    exercises: []
  };

  let currentExercise = null;
  let lineIndex = 0;

  // Parse header info
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Title is usually first line after "Mi entrenamiento:"
    if (i === 0 && line === 'Mi entrenamiento:') {
      workout.title = lines[i + 1];
      lineIndex = i + 2;
      continue;
    }

    // Date line - MEJORADO para detectar correctamente
    if (line.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/)) {
      workout.date = line;
      continue;
    }

    // Duration
    if (line.toUpperCase().includes('DURACIÓN')) {
      workout.duration = line.split(':')[1]?.trim() || '';
      continue;
    }

    // Volume
    if (line.includes('Volumen:')) {
      workout.volume = line.split(':')[1]?.trim() || '';
      continue;
    }

    // Calories
    if (line.includes('Calorías:')) {
      workout.calories = line.split(':')[1]?.trim() || '';
      continue;
    }

    // Exercise count
    if (line.includes('Ejercicios:')) {
      lineIndex = i + 1;
      break;
    }
  }

  // Parse exercises
  for (let i = lineIndex; i < lines.length; i++) {
    const line = lines[i];

    // Skip URLs and "Rastreado con Motra"
    if (line.startsWith('http') || line.includes('Rastreado con') || line.includes('motra.com')) {
      continue;
    }

    // Check if line is a set (starts with number:)
    const setMatch = line.match(/^(\d+):\s*(.+)/);
    
    if (setMatch) {
      if (!currentExercise) continue;

      const setNumber = parseInt(setMatch[1]);
      const setData = setMatch[2];

      // Parse set data
      const set = parseSetData(setData);
      currentExercise.sets.push({
        setNumber,
        ...set
      });
    } else {
      // New exercise
      if (currentExercise) {
        workout.exercises.push(currentExercise);
      }
      
      currentExercise = {
        name: line,
        sets: []
      };
    }
  }

  // Add last exercise
  if (currentExercise && currentExercise.sets.length > 0) {
    workout.exercises.push(currentExercise);
  }

  return workout;
}

function parseSetData(setData) {
  const set = {
    reps: null,
    weight: null,
    duration: null,
    type: 'reps' // 'reps' or 'time'
  };

  // Time-based (e.g., "01:01 x PC")
  const timeMatch = setData.match(/(\d{2}:\d{2})\s*x\s*(.+)/);
  if (timeMatch) {
    set.type = 'time';
    set.duration = timeMatch[1];
    set.weight = timeMatch[2].trim();
    return set;
  }

  // Reps-based (e.g., "12 repeticiones x 45 kg")
  const repsMatch = setData.match(/(\d+)\s*repeticiones?\s*x\s*(.+)/);
  if (repsMatch) {
    set.reps = parseInt(repsMatch[1]);
    set.weight = repsMatch[2].trim();
    return set;
  }

  // Fallback - just store raw data
  set.raw = setData;
  return set;
}

/**
 * Convierte un workout parseado al formato interno de la app
 */
export function convertToInternalFormat(parsedWorkout, targetDate = null) {
  // Si se proporciona targetDate, usarlo. Si no, usar hoy
  const dateKey = targetDate || new Date().toISOString().split('T')[0];
  
  const internalFormat = {
    [dateKey]: {}
  };

  parsedWorkout.exercises.forEach(exercise => {
    internalFormat[dateKey][exercise.name] = {};
    
    exercise.sets.forEach(set => {
      internalFormat[dateKey][exercise.name][set.setNumber] = {
        weight: set.weight,
        reps: set.reps || set.duration,
        timestamp: new Date().toISOString(),
        type: set.type
      };
    });
  });

  return internalFormat;
}

/**
 * Extrae metadata del workout
 */
export function extractWorkoutMetadata(parsedWorkout) {
  return {
    title: parsedWorkout.title,
    date: parsedWorkout.date,
    duration: parsedWorkout.duration,
    volume: parsedWorkout.volume,
    calories: parsedWorkout.calories,
    exerciseCount: parsedWorkout.exercises.length,
    totalSets: parsedWorkout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
  };
}

/**
 * Valida si un texto es un workout válido de Motra
 */
export function isValidMotraWorkout(text) {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  return (
    (lowerText.includes('mi entrenamiento') || lowerText.includes('duración')) &&
    (lowerText.includes('repeticiones') || lowerText.includes('x '))
  );
}

/**
 * Parse fecha de Motra a formato ISO - CORREGIDO
 * Ejemplo: "11 feb 2026, 18:36" → "2026-02-11"
 */
export function parseDateFromMotra(dateText) {
  try {
    // Buscar patrón: "11 feb 2026" o "11 feb 2026, 18:36"
    const match = dateText.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
    if (!match) return null;

    const [_, day, monthStr, year] = match;
    
    // Mapa de meses en español (3 letras)
    const monthMap = {
      'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
    };

    const monthNum = monthMap[monthStr.toLowerCase()];
    if (monthNum === undefined) return null;

    // Crear fecha en UTC para evitar problemas de zona horaria
    const date = new Date(Date.UTC(parseInt(year), monthNum, parseInt(day)));
    
    // Retornar en formato ISO (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Obtener nombre del día de la semana en español
 */
export function getDayName(dateString) {
  const date = new Date(dateString + 'T12:00:00'); // Agregar hora para evitar issues de timezone
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

/**
 * Formatear fecha para mostrar
 */
export function formatDateDisplay(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}