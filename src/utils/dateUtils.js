/**
 * DATE UTILITIES - FIX DEFINITIVO PARA TIMEZONE
 * 
 * PROBLEMA ROOT:
 * - new Date("2026-02-11") crea fecha en UTC 00:00
 * - En España (UTC+1), esto se interpreta como 2026-02-10 23:00 hora local
 * - Por eso aparece en día anterior o siguiente
 * 
 * SOLUCIÓN:
 * - SIEMPRE usar hora local del usuario
 * - NUNCA confiar en new Date(string) sin timezone
 * - Forzar hora 12:00 local para evitar edge cases
 */

/**
 * Obtiene la fecha ACTUAL en formato YYYY-MM-DD (hora local)
 * Esta es LA fecha de hoy del usuario
 */
export function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el día de la semana ACTUAL en español
 */
export function getTodayDayName() {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date().getDay()];
}

/**
 * Obtiene la fecha COMPLETA actual para pasarle a la IA
 */
export function getTodayFullInfo() {
  const now = new Date();
  const dateKey = getTodayDateKey();
  const dayName = getTodayDayName();
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  return {
    dateKey,
    dayName,
    fullDate: `${dayName} ${now.getDate()} de ${monthNames[now.getMonth()]} de ${now.getFullYear()}`,
    timestamp: now.toISOString()
  };
}

/**
 * Convierte dateKey (YYYY-MM-DD) a Date object SIN problemas de timezone
 * CRÍTICO: Añade T12:00:00 para forzar mediodía hora local
 */
export function dateKeyToDate(dateKey) {
  // Forzar hora 12:00 local para evitar problemas de timezone
  return new Date(dateKey + 'T12:00:00');
}

/**
 * Formatea fecha para mostrar al usuario
 */
export function formatDateDisplay(dateKey) {
  const date = dateKeyToDate(dateKey);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Obtiene el nombre del día de la semana de un dateKey
 */
export function getDayNameFromDateKey(dateKey) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const date = dateKeyToDate(dateKey);
  return days[date.getDay()];
}

/**
 * Parse fecha de Motra a formato YYYY-MM-DD CORRECTO
 * Ejemplo: "11 feb 2026, 18:36" → "2026-02-11"
 * 
 * SOLUCIÓN AL BUG:
 * - NO usar new Date() constructor que causa problemas de UTC
 * - Construir el string YYYY-MM-DD directamente
 */
export function parseDateFromMotra(dateText) {
  try {
    // Buscar patrón: "11 feb 2026" o "11 feb 2026, 18:36"
    const match = dateText.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
    if (!match) return null;

    const [_, dayStr, monthStr, yearStr] = match;
    
    // Mapa de meses en español (3 letras)
    const monthMap = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 
      'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 
      'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };

    const month = monthMap[monthStr.toLowerCase()];
    if (!month) return null;

    const day = dayStr.padStart(2, '0');
    const year = yearStr;
    
    // Construir string directamente sin usar Date object
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error parsing date from Motra:', error);
    return null;
  }
}

/**
 * Calcula diferencia de días entre dos dateKeys
 */
export function daysBetween(dateKey1, dateKey2) {
  const date1 = dateKeyToDate(dateKey1);
  const date2 = dateKeyToDate(dateKey2);
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si un dateKey es hoy
 */
export function isToday(dateKey) {
  return dateKey === getTodayDateKey();
}

/**
 * Obtiene dateKey de N días atrás
 */
export function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el key del día de la semana para WEEKLY_PLAN
 * Retorna: 'lunes', 'martes', etc.
 */
export function getCurrentDayKey() {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return days[new Date().getDay()];
}

/**
 * Compara dos dateKeys
 * Retorna: -1 si date1 < date2, 0 si iguales, 1 si date1 > date2
 */
export function compareDateKeys(dateKey1, dateKey2) {
  if (dateKey1 < dateKey2) return -1;
  if (dateKey1 > dateKey2) return 1;
  return 0;
}

/**
 * Convierte un Date object a dateKey (YYYY-MM-DD)
 * Usa la fecha LOCAL del usuario
 */
export function dateToDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el dateKey del primer día del mes dado
 */
export function getFirstDayOfMonth(year, month) {
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-01`;
}

/**
 * Obtiene el número de días en un mes
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}