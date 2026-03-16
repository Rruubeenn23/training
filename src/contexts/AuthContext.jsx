import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseAvailable()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) setProfile(data);
    } catch {}
    setLoading(false);
  };

  const requireSupabase = () => {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase no está configurado. Comprueba las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env y reinicia el servidor de desarrollo.');
    }
  };

  const signUp = async (email, password) => {
    requireSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    requireSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    requireSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!isSupabaseAvailable()) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email) => {
    requireSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}#reset-password`
    });
    if (error) throw error;
  };

  const markOnboardingComplete = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
  };

  const refreshProfile = () => {
    if (user) loadProfile(user.id);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isOnboardingComplete: profile?.onboarding_complete ?? false,
    displayName: profile?.display_name || user?.email?.split('@')[0] || 'Usuario',
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    markOnboardingComplete,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
