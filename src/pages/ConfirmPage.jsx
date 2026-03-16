import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ConfirmPage() {
  useEffect(() => {
    const run = async () => {
      const query = window.location.search || '';
      const hash = window.location.hash || '';
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const params = new URLSearchParams(hash.replace('#', ''));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (supabase && code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {});
      } else if (supabase && access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token }).catch(() => {});
      }

      window.location.replace('/auth/callback' + query + hash);
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold">Confirmando tu cuenta</p>
          <p className="text-slate-400 text-sm">Redirigiendo a la app...</p>
        </div>
      </div>
    </div>
  );
}
