import React, { useState } from 'react';
import { Dumbbell, Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseAvailable } from '../lib/supabase';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        await signUp(email, password);
        setSuccessMsg('¡Cuenta creada! Revisa tu email para confirmar.');
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccessMsg('Te hemos enviado un email con instrucciones.');
      }
    } catch (err) {
      const msg = err.message || 'Ocurrió un error';
      if (msg.includes('Invalid login')) setError('Email o contraseña incorrectos');
      else if (msg.includes('already registered')) setError('Este email ya está registrado');
      else if (msg.includes('Email not confirmed')) setError('Confirma tu email antes de iniciar sesión');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Error con Google');
    }
  };

  const supabaseReady = isSupabaseAvailable();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Supabase not configured warning */}
        {!supabaseReady && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 mb-4 flex gap-3">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-red-300 font-semibold mb-1">Supabase no está configurado</p>
              <p className="text-red-400/80">Asegúrate de que <code className="bg-red-500/20 px-1 rounded">.env</code> tiene <code className="bg-red-500/20 px-1 rounded">VITE_SUPABASE_URL</code> y <code className="bg-red-500/20 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>, luego <strong>reinicia el servidor</strong> (<code className="bg-red-500/20 px-1 rounded">npm run dev</code>).</p>
            </div>
          </div>
        )}
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Dumbbell className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">TrainingAI</h1>
          <p className="text-slate-400 text-sm mt-1">Tu coach personal con IA</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="flex bg-slate-700/50 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-white font-semibold text-lg">Recuperar contraseña</h2>
              <p className="text-slate-400 text-sm mt-1">Te enviaremos un enlace a tu email</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>

            {/* Password */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password */}
            {mode === 'signup' && (
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setSuccessMsg(''); }}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5">
                <p className="text-green-400 text-sm">{successMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

    //      {/* Divider + Google */}
  //        {/*mode !== 'reset' && (
     //       <>
       //       <div className="flex items-center gap-3 my-4">
         //       <div className="flex-1 h-px bg-slate-700" />
           //     <span className="text-slate-500 text-xs">o continúa con</span>
            //    <div className="flex-1 h-px bg-slate-700" />
            //  </div>
             //</div> <button
              //  onClick={handleGoogle}
               // className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              //>
               // <Chrome size={16} />
                //</div>Google
              //</button>
            //</>
         // )}

          {/* Back link for reset */}
          {mode === 'reset' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className="w-full text-slate-400 hover:text-white text-sm mt-4 transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Al continuar aceptas nuestros términos de uso
        </p>
      </div>
    </div>
  );
}
