import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const { user, loading, isOnboardingComplete } = useAuth();

  useEffect(() => {
    // Supabase automatically handles the code/hash exchange in the background over onAuthStateChange
    if (!loading) {
      if (user && isOnboardingComplete) {
        navigate('/home', { replace: true });
      } else if (user) {
        navigate('/onboarding', { replace: true });
      } else {
        // Give Supabase a bit more time just in case the background exchange takes a moment
        const t = setTimeout(() => navigate('/auth', { replace: true }), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [loading, user, isOnboardingComplete, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold">Confirmando tu cuenta</p>
          <p className="text-slate-400 text-sm">Validando credenciales...</p>
        </div>
      </div>
    </div>
  );
}

