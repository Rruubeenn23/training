import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase env vars not set. Create .env.local from .env.example');
}

const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: { fetch: fetchWithTimeout },
    })
  : null;

export const isSupabaseAvailable = () => supabase !== null;
