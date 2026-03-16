import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, Dumbbell, Loader, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { onboardingDataToMemory } from '../utils/aiMemory';

// ─── Predefined Plan Templates ────────────────────────────────────────────────
const PLAN_TEMPLATES = [
  {
    id: 'fullbody_3x',
    name: 'Cuerpo completo 3x',
    emoji: '🔄',
    description: 'Cuerpo completo 3 días por semana. Ideal para principiantes o quien quiere eficiencia máxima.',
    days: '3 días/semana',
    level: 'Principiante / Intermedio',
    plan: {
      lunes: {
        name: 'Fullbody A',
        focus: 'cuerpo completo',
        exercises: [
          { name: 'Sentadilla', sets: 3, reps: '8-10', rest_seconds: 120, notes: 'Espalda recta, rodillas hacia fuera' },
          { name: 'Press banca', sets: 3, reps: '8-10', rest_seconds: 90 },
          { name: 'Remo con barra', sets: 3, reps: '8-10', rest_seconds: 90 },
          { name: 'Press militar', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Curl bíceps', sets: 3, reps: '12', rest_seconds: 60 },
          { name: 'Extensión tríceps', sets: 3, reps: '12', rest_seconds: 60 },
        ],
      },
      miercoles: {
        name: 'Fullbody B',
        focus: 'cuerpo completo',
        exercises: [
          { name: 'Peso muerto', sets: 3, reps: '6-8', rest_seconds: 150, notes: 'Mantén la espalda neutral' },
          { name: 'Press inclinado', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Jalón al pecho', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Elevaciones laterales', sets: 3, reps: '15', rest_seconds: 60 },
          { name: 'Fondos en paralelas', sets: 3, reps: '10-12', rest_seconds: 60 },
          { name: 'Plancha', sets: 3, reps: '30-45s', rest_seconds: 60 },
        ],
      },
      viernes: {
        name: 'Fullbody C',
        focus: 'cuerpo completo',
        exercises: [
          { name: 'Prensa de piernas', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Aperturas con mancuernas', sets: 3, reps: '12-15', rest_seconds: 60 },
          { name: 'Dominadas o jalón', sets: 3, reps: '8-10', rest_seconds: 90 },
          { name: 'Arnold press', sets: 3, reps: '12', rest_seconds: 90 },
          { name: 'Martillo bíceps', sets: 3, reps: '12', rest_seconds: 60 },
          { name: 'Tríceps polea', sets: 3, reps: '15', rest_seconds: 60 },
        ],
      },
    },
  },
  {
    id: 'upper_lower_4x',
    name: 'Superior / Inferior 4x',
    emoji: '⚡',
    description: 'Divide el cuerpo en tren superior e inferior. Frecuencia 2 por músculo.',
    days: '4 días/semana',
    level: 'Intermedio',
    plan: {
      lunes: {
        name: 'Upper A — Fuerza',
        focus: 'pecho, espalda, hombros',
        exercises: [
          { name: 'Press banca', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Remo con barra', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Press militar', sets: 3, reps: '6-8', rest_seconds: 120 },
          { name: 'Dominadas', sets: 3, reps: '6-8', rest_seconds: 120 },
          { name: 'Curl bíceps barra', sets: 3, reps: '8-10', rest_seconds: 60 },
          { name: 'Fondos tríceps', sets: 3, reps: '8-10', rest_seconds: 60 },
        ],
      },
      martes: {
        name: 'Lower A — Fuerza',
        focus: 'cuádriceps, isquios, glúteos',
        exercises: [
          { name: 'Sentadilla', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Peso muerto rumano', sets: 3, reps: '6-8', rest_seconds: 120 },
          { name: 'Prensa de piernas', sets: 3, reps: '10', rest_seconds: 90 },
          { name: 'Curl femoral', sets: 3, reps: '10-12', rest_seconds: 60 },
          { name: 'Elevación de gemelos', sets: 4, reps: '15-20', rest_seconds: 60 },
        ],
      },
      jueves: {
        name: 'Upper B — Volumen',
        focus: 'pecho, espalda, hombros',
        exercises: [
          { name: 'Press inclinado mancuernas', sets: 4, reps: '10-12', rest_seconds: 90 },
          { name: 'Jalón al pecho', sets: 4, reps: '10-12', rest_seconds: 90 },
          { name: 'Elevaciones laterales', sets: 4, reps: '15', rest_seconds: 60 },
          { name: 'Remo en polea', sets: 3, reps: '12-15', rest_seconds: 60 },
          { name: 'Curl martillo', sets: 3, reps: '12', rest_seconds: 60 },
          { name: 'Extensión tríceps polea', sets: 3, reps: '15', rest_seconds: 60 },
        ],
      },
      viernes: {
        name: 'Lower B — Volumen',
        focus: 'cuádriceps, isquios, glúteos',
        exercises: [
          { name: 'Sentadilla frontal', sets: 3, reps: '8-10', rest_seconds: 120 },
          { name: 'Peso muerto', sets: 3, reps: '6-8', rest_seconds: 150 },
          { name: 'Zancadas', sets: 3, reps: '12 c/pierna', rest_seconds: 90 },
          { name: 'Extensión de cuádriceps', sets: 3, reps: '15', rest_seconds: 60 },
          { name: 'Hip thrust', sets: 3, reps: '12-15', rest_seconds: 90 },
        ],
      },
    },
  },
  {
    id: 'ppl_6x',
    name: 'Empuje / Tracción / Pierna',
    emoji: '🔥',
    description: 'El split más popular para volumen máximo. 6 días con alta frecuencia.',
    days: '6 días/semana',
    level: 'Intermedio / Avanzado',
    plan: {
      lunes: {
        name: 'Push A — Pecho enfocado',
        focus: 'pecho, hombros, tríceps',
        exercises: [
          { name: 'Press banca', sets: 4, reps: '6-8', rest_seconds: 120 },
          { name: 'Press inclinado', sets: 3, reps: '8-10', rest_seconds: 90 },
          { name: 'Aperturas cable', sets: 3, reps: '12-15', rest_seconds: 60 },
          { name: 'Press militar', sets: 3, reps: '8-10', rest_seconds: 90 },
          { name: 'Tríceps polea', sets: 3, reps: '15', rest_seconds: 60 },
        ],
      },
      martes: {
        name: 'Pull A — Espalda enfocada',
        focus: 'espalda, bíceps, femorales',
        exercises: [
          { name: 'Dominadas', sets: 4, reps: '6-8', rest_seconds: 120 },
          { name: 'Remo con barra', sets: 4, reps: '8-10', rest_seconds: 90 },
          { name: 'Jalón en polea', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Curl bíceps barra', sets: 3, reps: '10-12', rest_seconds: 60 },
          { name: 'Curl martillo', sets: 3, reps: '12', rest_seconds: 60 },
        ],
      },
      miercoles: {
        name: 'Legs A — Cuádriceps',
        focus: 'cuádriceps, glúteos, gemelos',
        exercises: [
          { name: 'Sentadilla', sets: 4, reps: '6-8', rest_seconds: 150 },
          { name: 'Prensa de piernas', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Extensión de cuádriceps', sets: 3, reps: '15', rest_seconds: 60 },
          { name: 'Hip thrust', sets: 3, reps: '12', rest_seconds: 90 },
          { name: 'Elevación de gemelos', sets: 4, reps: '20', rest_seconds: 60 },
        ],
      },
      jueves: {
        name: 'Push B — Hombros enfocado',
        focus: 'hombros, pecho, tríceps',
        exercises: [
          { name: 'Press militar', sets: 4, reps: '6-8', rest_seconds: 120 },
          { name: 'Elevaciones laterales', sets: 4, reps: '15', rest_seconds: 60 },
          { name: 'Press Arnold', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Press inclinado mancuernas', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Fondos en paralelas', sets: 3, reps: '10-12', rest_seconds: 60 },
        ],
      },
      viernes: {
        name: 'Pull B — Bíceps enfocado',
        focus: 'espalda, bíceps, romboides',
        exercises: [
          { name: 'Remo en polea baja', sets: 4, reps: '10-12', rest_seconds: 90 },
          { name: 'Jalón al pecho agarre estrecho', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Curl bíceps mancuernas', sets: 4, reps: '12', rest_seconds: 60 },
          { name: 'Face pulls', sets: 3, reps: '15-20', rest_seconds: 60 },
          { name: 'Curl concentrado', sets: 3, reps: '12', rest_seconds: 60 },
        ],
      },
      sabado: {
        name: 'Legs B — Isquios',
        focus: 'isquiotibiales, glúteos, gemelos',
        exercises: [
          { name: 'Peso muerto', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Peso muerto rumano', sets: 3, reps: '8-10', rest_seconds: 120 },
          { name: 'Curl femoral', sets: 4, reps: '12', rest_seconds: 60 },
          { name: 'Zancadas', sets: 3, reps: '12 c/pierna', rest_seconds: 90 },
          { name: 'Elevación de gemelos sentado', sets: 4, reps: '20', rest_seconds: 60 },
        ],
      },
    },
  },
  {
    id: 'torso_pierna',
    name: 'Torso / Pierna 4x',
    emoji: '💪',
    description: 'Torso completo (pecho + espalda juntos) y pierna. Muy equilibrado y eficiente.',
    days: '4 días/semana',
    level: 'Intermedio',
    plan: {
      lunes: {
        name: 'Torso A — Fuerza',
        focus: 'pecho, espalda, hombros',
        exercises: [
          { name: 'Press banca', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Remo con barra', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Press militar', sets: 3, reps: '6-8', rest_seconds: 120 },
          { name: 'Jalón al pecho', sets: 3, reps: '8-10', rest_seconds: 90 },
          { name: 'Elevaciones laterales', sets: 3, reps: '15', rest_seconds: 60 },
        ],
      },
      martes: {
        name: 'Pierna A — Cuádriceps',
        focus: 'cuádriceps, glúteos, isquios',
        exercises: [
          { name: 'Sentadilla', sets: 4, reps: '6-8', rest_seconds: 150 },
          { name: 'Prensa de piernas', sets: 3, reps: '10-12', rest_seconds: 90 },
          { name: 'Zancadas', sets: 3, reps: '12 c/pierna', rest_seconds: 90 },
          { name: 'Curl femoral', sets: 3, reps: '12', rest_seconds: 60 },
          { name: 'Elevación gemelos', sets: 4, reps: '20', rest_seconds: 60 },
        ],
      },
      jueves: {
        name: 'Torso B — Volumen',
        focus: 'pecho, espalda, hombros, brazos',
        exercises: [
          { name: 'Press inclinado mancuernas', sets: 4, reps: '10-12', rest_seconds: 90 },
          { name: 'Dominadas', sets: 4, reps: '8-10', rest_seconds: 90 },
          { name: 'Aperturas cable', sets: 3, reps: '15', rest_seconds: 60 },
          { name: 'Remo en polea', sets: 3, reps: '12', rest_seconds: 60 },
          { name: 'Curl bíceps', sets: 3, reps: '12', rest_seconds: 60 },
          { name: 'Tríceps polea', sets: 3, reps: '15', rest_seconds: 60 },
        ],
      },
      viernes: {
        name: 'Pierna B — Isquios y glúteos',
        focus: 'isquiotibiales, glúteos, gemelos',
        exercises: [
          { name: 'Peso muerto', sets: 4, reps: '5-6', rest_seconds: 150 },
          { name: 'Hip thrust', sets: 4, reps: '10-12', rest_seconds: 90 },
          { name: 'Peso muerto rumano', sets: 3, reps: '8-10', rest_seconds: 120 },
          { name: 'Extensión de cuádriceps', sets: 3, reps: '15', rest_seconds: 60 },
          { name: 'Elevación gemelos sentado', sets: 4, reps: '20', rest_seconds: 60 },
        ],
      },
    },
  },
  {
    id: 'ai_custom',
    name: 'Personalizado con IA',
    emoji: '🤖',
    description: 'El Coach IA diseñará un plan 100% adaptado a tu perfil, equipamiento y objetivos.',
    days: 'Flexible',
    level: 'Cualquier nivel',
    plan: null, // Generated by AI
  },
];

// ─── Onboarding Steps ─────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'name',
    question: '¡Hola! ¿Cómo te llamas?',
    sub: 'Me ayudará a personalizar tu experiencia.',
    type: 'text',
    placeholder: 'Tu nombre',
    field: 'name',
    required: true,
  },
  {
    id: 'age_weight_height',
    question: 'Cuéntame un poco más sobre ti',
    sub: 'Usaré estos datos para calcular tu progresión óptima.',
    type: 'triple',
    fields: [
      { label: 'Edad', key: 'age', placeholder: '25', unit: 'años', type: 'number' },
      { label: 'Peso', key: 'weight', placeholder: '75', unit: 'kg', type: 'number' },
      { label: 'Altura', key: 'height', placeholder: '175', unit: 'cm', type: 'number' },
    ],
  },
  {
    id: 'goal',
    question: '¿Cuáles son tus objetivos?',
    sub: 'Selecciona todos los que apliquen.',
    type: 'multiselect',
    field: 'goals',
    required: true,
    options: [
      { value: 'muscle_gain', label: 'Ganar músculo', emoji: '💪' },
      { value: 'fat_loss', label: 'Perder grasa', emoji: '🔥' },
      { value: 'strength', label: 'Ganar fuerza', emoji: '🏋️' },
      { value: 'endurance', label: 'Mejorar resistencia', emoji: '🏃' },
      { value: 'recomposition', label: 'Recomposición corporal', emoji: '⚖️' },
      { value: 'general_fitness', label: 'Fitness general', emoji: '✨' },
      { value: 'health', label: 'Salud y bienestar', emoji: '❤️' },
      { value: 'sport_performance', label: 'Rendimiento deportivo', emoji: '⚽' },
    ],
  },
  {
    id: 'experience',
    question: '¿Cuánto tiempo llevas entrenando?',
    sub: 'Ajustaré la complejidad y el volumen a tu nivel.',
    type: 'select',
    field: 'experience',
    options: [
      { value: 'beginner', label: 'Principiante (< 1 año)', emoji: '🌱' },
      { value: 'intermediate', label: 'Intermedio (1-3 años)', emoji: '📈' },
      { value: 'advanced', label: 'Avanzado (3+ años)', emoji: '🎯' },
    ],
  },
  {
    id: 'days',
    question: '¿Cuántos días por semana puedes entrenar?',
    sub: 'Diseñaré el split perfecto para tu disponibilidad.',
    type: 'select',
    field: 'daysPerWeek',
    options: [
      { value: '2', label: '2 días', emoji: '📅' },
      { value: '3', label: '3 días', emoji: '📅' },
      { value: '4', label: '4 días', emoji: '📅' },
      { value: '5', label: '5 días', emoji: '📅' },
      { value: '6', label: '6 días', emoji: '📅' },
    ],
  },
  {
    id: 'preferred_days',
    question: '¿Qué días prefieres entrenar?',
    sub: 'Selecciona todos los que apliquen.',
    type: 'multiselect',
    field: 'preferredDays',
    optional: true,
    options: [
      { value: 'lunes', label: 'Lunes' },
      { value: 'martes', label: 'Martes' },
      { value: 'miercoles', label: 'Miércoles' },
      { value: 'jueves', label: 'Jueves' },
      { value: 'viernes', label: 'Viernes' },
      { value: 'sabado', label: 'Sábado' },
      { value: 'domingo', label: 'Domingo' },
    ],
  },
  {
    id: 'equipment',
    question: '¿Con qué equipamiento cuentas?',
    sub: 'Adaptaré todos los ejercicios a lo que tienes disponible.',
    type: 'multiselect',
    field: 'equipment',
    required: true,
    options: [
      { value: 'gym_full', label: 'Gimnasio completo', emoji: '🏋️' },
      { value: 'dumbbells', label: 'Mancuernas', emoji: '🔵' },
      { value: 'barbell', label: 'Barra olímpica', emoji: '🟡' },
      { value: 'machines', label: 'Máquinas', emoji: '⚙️' },
      { value: 'cables', label: 'Poleas/Cables', emoji: '〰️' },
      { value: 'pull_up_bar', label: 'Barra de dominadas', emoji: '🔴' },
      { value: 'bands', label: 'Bandas elásticas', emoji: '🟢' },
      { value: 'bodyweight_only', label: 'Solo peso corporal', emoji: '🤸' },
    ],
  },
  {
    id: 'activity_level',
    question: '¿Cómo describirías tu nivel de actividad general?',
    sub: 'Más allá del gimnasio — trabajo, movimiento diario...',
    type: 'select',
    field: 'activityLevel',
    options: [
      { value: 'sedentary', label: 'Sedentario', sub: 'Trabajo de oficina, poco movimiento', emoji: '🪑' },
      { value: 'lightly_sedentary', label: 'Entre sedentario y activo', sub: 'Algo de movimiento pero trabajo sentado', emoji: '🚶' },
      { value: 'lightly_active', label: 'Ligeramente activo', sub: 'Caminatas, trabajo de pie ocasional', emoji: '🏃' },
      { value: 'moderately_active', label: 'Moderadamente activo', sub: 'Muevo bastante en el día a día', emoji: '🚴' },
      { value: 'very_active', label: 'Muy activo', sub: 'Trabajo físico o muy deportivo', emoji: '⚡' },
    ],
  },
  {
    id: 'injuries',
    question: '¿Tienes alguna lesión o limitación física?',
    sub: 'Seré cuidadoso con los ejercicios que te asigne.',
    type: 'multiselect',
    field: 'injuries',
    optional: true,
    options: [
      { value: 'none', label: 'Ninguna', emoji: '✅' },
      { value: 'lower_back', label: 'Espalda baja', emoji: '🔴' },
      { value: 'shoulder', label: 'Hombro', emoji: '🔴' },
      { value: 'knee', label: 'Rodilla', emoji: '🔴' },
      { value: 'elbow', label: 'Codo/Tendón', emoji: '🔴' },
      { value: 'neck', label: 'Cuello', emoji: '🔴' },
      { value: 'hip', label: 'Cadera', emoji: '🔴' },
    ],
  },
  {
    id: 'notes',
    question: '¿Algo más que deba saber?',
    sub: 'Medicación, deportes que practicas, preferencias... o deja en blanco.',
    type: 'textarea',
    placeholder: 'Ej: juego fútbol los domingos, tomo metformina, prefiero no hacer sentadilla...',
    field: 'medicationNotes',
    optional: true,
  },
  {
    id: 'plan_template',
    question: 'Elige tu plan de partida',
    sub: 'Podrás personalizarlo con el Coach IA en cualquier momento.',
    type: 'plan_select',
    field: 'planTemplate',
    required: true,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user, markOnboardingComplete } = useAuth();
  const { setMemory, savePlan } = useAppData();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const step = STEPS[currentStep];
  const progress = (currentStep / STEPS.length) * 100;

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [currentStep]);

  const getValue = (field) => answers[field] ?? '';
  const getMulti = (field) => answers[field] ?? [];

  const setField = (field, value) => setAnswers(prev => ({ ...prev, [field]: value }));

  const toggleMulti = (field, value) => {
    const current = getMulti(field);
    if (value === 'none') { setField(field, ['none']); return; }
    const withoutNone = current.filter(v => v !== 'none');
    if (withoutNone.includes(value)) setField(field, withoutNone.filter(v => v !== value));
    else setField(field, [...withoutNone, value]);
  };

  const canProceed = () => {
    if (step.optional) return true;
    if (step.type === 'plan_select') return !!getValue(step.field);
    if (step.type === 'text' || step.type === 'textarea') return (getValue(step.field) || '').trim().length > 0;
    if (step.type === 'triple') return step.fields.every(f => getValue(f.key) !== '');
    if (step.type === 'select') return getValue(step.field) !== '';
    if (step.type === 'multiselect') return step.optional || getMulti(step.field).length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
    else handleFinish();
  };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  const handleFinish = async () => {
    setGenerating(true);
    const groqKey = import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';

    try {
      // Build memory from answers (normalize goals: use first goal as primary if multiple)
      const memoryData = {
        ...answers,
        goal: Array.isArray(answers.goals) ? answers.goals[0] : answers.goals,
      };
      const memory = onboardingDataToMemory(memoryData);
      await setMemory(memory);

      const template = PLAN_TEMPLATES.find(t => t.id === answers.planTemplate);
      if (template?.plan) {
        await savePlan(template.plan, template.name);
      } else if (template?.id === 'ai_custom' && groqKey) {
        await generateAIPlan(answers, groqKey);
      }

      await markOnboardingComplete();
      setDone(true);
    } catch (err) {
      console.error('Onboarding error:', err);
      await markOnboardingComplete().catch(() => {});
      setDone(true);
    } finally {
      setGenerating(false);
    }
  };

  const generateAIPlan = async (data, apiKey) => {
    const goals = Array.isArray(data.goals) ? data.goals.join(', ') : (data.goals || 'general fitness');
    const prompt = `Crea un plan semanal de entrenamiento en JSON para este usuario:
- Objetivos: ${goals}
- Nivel: ${data.experience}, Días/semana: ${data.daysPerWeek}
- Equipamiento: ${(data.equipment || []).join(', ')}
- Lesiones: ${(data.injuries || ['ninguna']).join(', ')}
- Notas: ${data.medicationNotes || 'ninguna'}

Responde SOLO con JSON: { "name": "Nombre del plan", "lunes": { "name": "...", "focus": "...", "exercises": [{ "name": "...", "sets": 3, "reps": "8-12", "rest_seconds": 90 }] }, ... }
Todo en español. Incluye solo días de entrenamiento, omite descansos.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });
    if (!res.ok) return;
    const result = await res.json();
    const content = result.choices[0].message.content;
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(content.slice(start, end + 1));
      const { name, ...days } = parsed;
      await savePlan(days, name || 'Mi Plan IA');
    }
  };

  // ─── Done ─────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6">
            <Check size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo, {answers.name}!</h2>
          <p className="text-slate-400 mb-6">Tu perfil y plan están listos. ¡Vamos a entrenar!</p>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Generating ───────────────────────────────────────────────────────────
  if (generating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
            <Loader size={36} className="text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Preparando todo...</h2>
          <p className="text-slate-400">Guardando tu perfil y configurando el plan</p>
        </div>
      </div>
    );
  }

  // ─── Steps ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="text-slate-400 text-sm">{currentStep + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress + (100 / STEPS.length)}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="max-w-lg mx-auto">
          <div className="mb-6 mt-2">
            <h2 className="text-2xl font-bold text-white mb-1">{step.question}</h2>
            {step.sub && <p className="text-slate-400 text-sm">{step.sub}</p>}
          </div>

          {/* Text input */}
          {step.type === 'text' && (
            <input
              ref={inputRef}
              type="text"
              value={getValue(step.field)}
              onChange={e => setField(step.field, e.target.value)}
              placeholder={step.placeholder}
              onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()}
              className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          )}

          {/* Textarea */}
          {step.type === 'textarea' && (
            <textarea
              ref={inputRef}
              value={getValue(step.field)}
              onChange={e => setField(step.field, e.target.value)}
              placeholder={step.placeholder}
              rows={4}
              className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          )}

          {/* Triple input */}
          {step.type === 'triple' && (
            <div className="grid grid-cols-3 gap-3">
              {step.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-slate-400 text-xs mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={getValue(f.key)}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-3 text-white placeholder-slate-500 text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                  <span className="block text-center text-slate-500 text-xs mt-1">{f.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Select */}
          {step.type === 'select' && (
            <div className="space-y-2">
              {step.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setField(step.field, opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    getValue(step.field) === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 bg-slate-800/40 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.emoji && <span className="text-xl flex-shrink-0">{opt.emoji}</span>}
                  <div className="flex-1">
                    <p className="font-medium">{opt.label}</p>
                    {opt.sub && <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>}
                  </div>
                  {getValue(step.field) === opt.value && <Check size={16} className="text-blue-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Multiselect */}
          {step.type === 'multiselect' && (
            <div className="grid grid-cols-2 gap-2">
              {step.options.map(opt => {
                const selected = getMulti(step.field).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleMulti(step.field, opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      selected
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-600 bg-slate-800/40 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {opt.emoji && <span className="flex-shrink-0">{opt.emoji}</span>}
                    <span className="text-sm font-medium">{opt.label}</span>
                    {selected && <Check size={12} className="ml-auto text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Plan template select */}
          {step.type === 'plan_select' && (
            <div className="space-y-3">
              {PLAN_TEMPLATES.map(template => {
                const selected = getValue(step.field) === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => setField(step.field, template.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 bg-slate-800/40 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.emoji}</span>
                        <div>
                          <p className="font-semibold text-white">{template.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{template.days} · {template.level}</p>
                        </div>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-2 ml-10">{template.description}</p>
                    {template.plan && (
                      <div className="mt-2 ml-10 flex flex-wrap gap-1">
                        {Object.entries(template.plan).map(([day, w]) => (
                          <span key={day} className="text-xs bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full">
                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}: {w.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-600 text-slate-300 hover:text-white transition-all"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {currentStep === STEPS.length - 1 ? (
              <><Check size={18} /> ¡Empezar!</>
            ) : (
              <>Continuar <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
