import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useAppData } from './contexts/AppDataContext';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import LandingPage from './pages/LandingPage';
import AppLayout from './pages/AppLayout';
import HomePage from './pages/HomePage';
import TrainingPage from './pages/TrainingPage';
import CoachPage from './pages/CoachPage';
import ProgressPage from './pages/ProgressPage';
import ProfilePage from './pages/ProfilePage';
import FeelingsPage from './pages/FeelingsPage';
import NutritionPage from './pages/NutritionPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LogoutPage from './pages/LogoutPage';
import ConfirmPage from './pages/ConfirmPage';

function AppLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading, isOnboardingComplete } = useAuth();
  const { dataLoading } = useAppData();
  const location = useLocation();
  // Safety timeout — if loading takes more than 8s, stop blocking the UI
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const isLoading = !timedOut && (loading || (user && dataLoading));

  if (isLoading) return <AppLoading />;
  if (!user) {
    const target = location.pathname + location.search + location.hash;
    localStorage.setItem('post_auth_redirect', target);
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  if (!isOnboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

function AuthGate({ children }) {
  const { user, loading, isOnboardingComplete } = useAuth();
  const { dataLoading } = useAppData();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const isLoading = !timedOut && (loading || (user && dataLoading));
  if (isLoading) return <AppLoading />;
  if (user && isOnboardingComplete) {
    const target = localStorage.getItem('post_auth_redirect');
    const isSafe = target && target.startsWith('/') && !target.startsWith('//') && !target.includes(':');
    if (isSafe && !['/auth', '/onboarding', '/'].includes(target)) {
      localStorage.removeItem('post_auth_redirect');
      return <Navigate to={target} replace />;
    }
    localStorage.removeItem('post_auth_redirect');
    return <Navigate to="/home" replace />;
  }
  if (user && !isOnboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

function OnboardingGate({ children }) {
  const { user, loading, isOnboardingComplete } = useAuth();
  const { dataLoading } = useAppData();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);
  const isLoading = !timedOut && (loading || (user && dataLoading));
  if (isLoading) return <AppLoading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isOnboardingComplete) return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/confirm" element={<ConfirmPage />} />
      <Route
        path="/auth"
        element={
          <AuthGate>
            <AuthPage />
          </AuthGate>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardingGate>
            <OnboardingPage />
          </OnboardingGate>
        }
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/app" element={<Navigate to="/home" replace />} />
      <Route path="/train" element={<Navigate to="/training" replace />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/feelings" element={<FeelingsPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
