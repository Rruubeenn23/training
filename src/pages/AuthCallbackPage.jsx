import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading, isOnboardingComplete } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = window.location.hash || '';
        const params = new URLSearchParams(hash.replace('#', ''));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (supabase && code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) setError(exErr.message);
        } else if (supabase && access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr) setError(setErr.message);
        }
      } catch (e) {
        setError(e?.message || 'Error al confirmar sesión');
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (user && isOnboardingComplete) navigate('/home', { replace: true });
      else if (user) navigate('/onboarding', { replace: true });
      else navigate('/auth', { replace: true });
    }
  }, [loading, user, isOnboardingComplete, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">{error ? `Error: ${error}` : 'Confirmando cuenta...'}</p>
      </div>
    </div>
  );
}
