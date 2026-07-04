'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SWACANA] Root error:', error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center bg-background text-foreground vintage-paper">
      <div className="clay-card p-8 max-w-md text-center animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-danger/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-danger" />
        </div>

        <h1 className="text-lg font-bold text-foreground mb-2">
          Terjadi Kesalahan
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-6">
          Aplikasi mengalami masalah yang tidak terduga. Coba muat ulang halaman atau kembali ke beranda.
        </p>

        {error.message && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-danger/8 border border-danger/20 text-left">
            <p className="text-xs text-danger font-mono break-all">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="clay-btn flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2.5 rounded-xl bg-surface2 text-foreground hover:bg-surface3 border border-border text-xs font-medium transition-all flex items-center gap-2"
          >
            <Home size={14} />
            Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
