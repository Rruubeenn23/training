import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Brain, TrendingUp, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">TrainingAI</span>
          </div>
          <Link to="/auth" className="text-sm text-blue-400 hover:text-blue-300">
            Iniciar sesión
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight">
              Tu entrenamiento, con memoria y progreso real
            </h1>
            <p className="text-slate-400 mt-4 text-lg">
              Registra tus entrenos, analiza tu evolución y deja que el Coach IA ajuste tu plan
              de forma inteligente.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/auth"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-5 py-3 rounded-xl"
              >
                Empezar ahora
              </Link>
              <Link
                to="/home"
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-3 rounded-xl"
              >
                Ir a la app
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <FeatureCard
              icon={<Brain className="w-5 h-5 text-purple-400" />}
              title="Coach IA real"
              text="Ajusta tu rutina, crea ciclos y analiza tu progreso."
            />
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              title="Progresión automática"
              text="PRs, objetivos por ejercicio y recomendaciones claras."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-5 h-5 text-blue-400" />}
              title="Local-first + nube"
              text="Funciona offline y sincroniza con Supabase cuando quieras."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-white font-semibold">{title}</p>
        <p className="text-slate-400 text-sm mt-1">{text}</p>
      </div>
    </div>
  );
}
