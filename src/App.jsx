import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import MainApp from './pages/MainApp';
import { useAppData } from './contexts/AppDataContext';

function AppContent() {
  const { user, loading, isOnboardingComplete } = useAuth();
  const { dataLoading } = useAppData();
  // Safety timeout — if loading takes more than 8s, stop blocking the UI
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const isLoading = !timedOut && (loading || (user && dataLoading));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!isOnboardingComplete) return <OnboardingPage />;
  return <MainApp />;
}

export default function App() {
  return <AppContent />;
}
