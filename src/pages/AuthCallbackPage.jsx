import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading, isOnboardingComplete } = useAuth();

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
        <p className="text-slate-400 text-sm">Confirmando cuenta...</p>
      </div>
    </div>
  );
}
