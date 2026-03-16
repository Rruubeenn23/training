import React, { useEffect } from 'react';

export default function ConfirmPage() {
  useEffect(() => {
    const t = setTimeout(() => {
      const query = window.location.search || '';
      const hash = window.location.hash || '';
      window.location.replace('/auth/callback' + query + hash);
    }, 900);
    return () => clearTimeout(t);
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
