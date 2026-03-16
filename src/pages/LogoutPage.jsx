import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LogoutPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      await signOut();
      navigate('/auth', { replace: true });
    };
    run();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Cerrando sesión...</p>
      </div>
    </div>
  );
}
