import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, Dumbbell, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { onboardingDataToMemory } from '../utils/aiMemory';
import { upsertAIMemory } from '../utils/database';

// ─── Step Definitions ────────────────────────────────────────────────────────

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
    question: '¿Cuál es tu objetivo principal?',
    sub: 'Esto definirá cómo estructuro tu entrenamiento.',
    type: 'select',
    field: 'goal',
    options: [
      { value: 'muscle_gain', label: 'Ganar músculo', emoji: '💪' },
      { value: 'fat_loss', label: 'Perder grasa', emoji: '🔥' },
      { value: 'strength', label: 'Ganar fuerza', emoji: '🏋️' },
      { value: 'endurance', label: 'Mejorar resistencia', emoji: '🏃' },
      { value: 'recomposition', label: 'Recomposición corporal', emoji: '⚖️' },
      { value: 'general_fitness', label: 'Fitness general', emoji: '✨' },
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
      { value: 'sedentary', label: 'Sedentario (trabajo de oficina)', emoji: '🪑' },
      { value: 'lightly_active', label: 'Ligeramente activo', emoji: '🚶' },
      { value: 'moderately_active', label: 'Moderadamente activo', emoji: '🚴' },
      { value: 'very_active', label: 'Muy activo (trabajo físico)', emoji: '⚡' },
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
      { value: 'neck', label: 'Cuello/Cervicales', emoji: '🔴' },
      { value: 'hip', label: 'Cadera', emoji: '🔴' },
    ],
  },
  {
    id: 'sports',
    question: '¿Practicas algún deporte o actividad fuera del gym?',
    sub: 'Opciones: fútbol, natación, ciclismo, artes marciales... o escribe el tuyo.',
    type: 'text',
    placeholder: 'Ej: fútbol los domingos (o "ninguno")',
    field: 'sports',
    optional: true,
  },
  {
    id: 'notes',
    question: '¿Algo más que deba saber?',
    sub: 'Medicación, condiciones médicas, preferencias especiales... Lo que quieras que tenga en cuenta.',
    type: 'textarea',
    placeholder: 'Opcional — escribe lo que quieras o deja en blanco',
    field: 'medicationNotes',
    optional: true,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, markOnboardingComplete } = useAuth();
  const { setMemory, savePlan } = useAppData();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const step = STEPS[currentStep];
  const progress = ((currentStep) / STEPS.length) * 100;

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [currentStep]);

  const getValue = (field) => answers[field] ?? '';
  const getMulti = (field) => answers[field] ?? [];

  const setField = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const toggleMulti = (field, value) => {
    const current = getMulti(field);
    if (value === 'none') {
      setField(field, ['none']);
      return;
    }
    const withoutNone = current.filter(v => v !== 'none');
    if (withoutNone.includes(value)) {
      setField(field, withoutNone.filter(v => v !== value));
    } else {
      setField(field, [...withoutNone, value]);
    }
  };

  const canProceed = () => {
    if (step.optional) return true;
    if (step.type === 'text' || step.type === 'textarea') {
      return step.optional || (getValue(step.field) || '').trim().length > 0;
    }
    if (step.type === 'triple') {
      return step.fields.every(f => getValue(f.key) !== '');
    }
    if (step.type === 'select') {
      return getValue(step.field) !== '';
    }
    if (step.type === 'multiselect') {
      return step.optional || getMulti(step.field).length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleFinish = async () => {
    setGenerating(true);
    const groqKey = localStorage.getItem('groq_api_key') || '';

    try {
      // Build AI memory from onboarding data
      const memory = onboardingDataToMemory(answers);
      await setMemory(memory);

      // Generate initial training plan via AI
      if (groqKey) {
        await generateInitialPlan(answers, groqKey);
      }

      await markOnboardingComplete();
      setDone(true);
    } catch (err) {
      console.error('Onboarding finish error:', err);
      // Still complete even if plan generation fails
      await markOnboardingComplete().catch(() => {});
      setDone(true);
    } finally {
      setGenerating(false);
    }
  };

  const generateInitialPlan = async (data, apiKey) => {
    const goalLabels = {
      muscle_gain: 'hipertrofia/ganancia muscular',
      fat_loss: 'pérdida de grasa',
      strength: 'fuerza máxima',
      endurance: 'resistencia',
      recomposition: 'recomposición corporal',
      general_fitness: 'fitness general',
    };

    const prompt = `Eres un coach experto. Crea un plan de entrenamiento semanal personalizado para este usuario.

PERFIL:
- Nombre: ${data.name}
- Edad: ${data.age} años, Peso: ${data.weight}kg, Altura: ${data.height}cm
- Objetivo: ${goalLabels[data.goal] || data.goal}
- Nivel: ${data.experience}
- Días disponibles: ${data.daysPerWeek} días/semana (preferencia: ${(data.preferredDays || []).join(', ')})
- Equipamiento: ${(data.equipment || []).join(', ')}
- Nivel de actividad: ${data.activityLevel}
- Lesiones: ${(data.injuries || ['ninguna']).join(', ')}
- Deportes/actividades: ${data.sports || 'ninguno'}
- Notas: ${data.medicationNotes || 'ninguna'}

Responde SOLO con JSON válido con esta estructura:
{
  "name": "Nombre del plan",
  "days": {
    "lunes": {
      "name": "Nombre del día",
      "focus": "músculo(s) principal(es)",
      "exercises": [
        {
          "name": "Nombre ejercicio",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "indicación técnica breve"
        }
      ]
    }
  }
}

Solo incluye los días que correspondan al schedule del usuario. Si un día es descanso, omítelo.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) return;
    const result = await response.json();
    const content = result.choices[0].message.content;
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const plan = JSON.parse(content.slice(start, end + 1));
      await savePlan(plan, plan.name || 'Mi Plan');
    }
  };

  // ─── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6">
            <Check size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo, {answers.name}!</h2>
          <p className="text-slate-400 mb-6">He creado tu perfil y tu plan de entrenamiento personalizado. ¡Vamos a empezar!</p>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Generating screen ─────────────────────────────────────────────────────
  if (generating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
            <Loader size={36} className="text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Creando tu plan...</h2>
          <p className="text-slate-400">Analizando tu perfil y generando un entrenamiento personalizado</p>
        </div>
      </div>
    );
  }

  // ─── Steps ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="text-slate-400 text-sm">{currentStep + 1} / {STEPS.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress + (100 / STEPS.length)}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 flex flex-col justify-center max-w-lg mx-auto w-full pb-32">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{step.question}</h2>
          {step.sub && <p className="text-slate-400">{step.sub}</p>}
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
            className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
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
                <div className="relative">
                  <input
                    type={f.type}
                    value={getValue(f.key)}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-3 text-white placeholder-slate-500 text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                  <span className="block text-center text-slate-500 text-xs mt-1">{f.unit}</span>
                </div>
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
                {opt.emoji && <span className="text-xl">{opt.emoji}</span>}
                <span className="font-medium">{opt.label}</span>
                {getValue(step.field) === opt.value && (
                  <Check size={16} className="ml-auto text-blue-400" />
                )}
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
                  {opt.emoji && <span>{opt.emoji}</span>}
                  <span className="text-sm font-medium">{opt.label}</span>
                  {selected && <Check size={12} className="ml-auto text-blue-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
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
              <>Generar mi plan <Check size={18} /></>
            ) : (
              <>Continuar <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
