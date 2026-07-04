'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NoteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[SWACANA] Note error:', error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center bg-background text-foreground vintage-paper">
      <div className="clay-card p-8 max-w-md text-center animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-warning/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-warning" />
        </div>

        <h1 className="text-lg font-bold text-foreground mb-2">
          Catatan Tidak Dapat Dimuat
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-6">
          Terjadi masalah saat memuat catatan ini. Ini mungkin karena data yang rusak atau masalah koneksi.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="clay-btn flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2.5 rounded-xl bg-surface2 text-foreground hover:bg-surface3 border border-border text-xs font-medium transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
