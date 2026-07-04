'use client';

import { useState, useCallback } from 'react';
import { Download, CheckCircle, Cpu, ChevronDown } from 'lucide-react';
import {
  FREE_MODELS,
  isEngineLoaded,
  getEngine,
  type LoadProgress,
} from '@/lib/webllm-client';
import { cn } from '@/lib/utils';

interface Props {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  onProgress: (p: LoadProgress | null) => void;
  loadProgress: LoadProgress | null;
}

export default function ModelLoader({
  selectedModelId,
  onModelChange,
  onProgress,
  loadProgress,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedModel = FREE_MODELS.find((m) => m.id === selectedModelId) ?? FREE_MODELS[0];
  const loaded = isEngineLoaded(selectedModelId);

  const handleLoad = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      await getEngine(selectedModelId, (p) => onProgress(p));
      onProgress(null);
    } catch (err) {
      console.error('[model-loader] Load failed', err);
      onProgress({ text: `Failed to load: ${(err as Error).message}`, progress: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedModelId, loaded, loading, onProgress]);

  const progressPct = loadProgress ? Math.round(loadProgress.progress * 100) : 0;

  return (
    <div className="px-3 py-2 border-b border-border space-y-2">
      {/* Model selector */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-surface2 hover:bg-surface3 text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-border transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Cpu size={12} className="text-accent shrink-0" />
            <span className="font-medium">{selectedModel.label}</span>
            <span className="text-muted">· {selectedModel.sizeGB}GB</span>
          </span>
          <ChevronDown
            size={12}
            className={cn('text-muted transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            {FREE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onModelChange(m.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-xs hover:bg-surface2 transition-colors border-b border-border/50 last:border-0',
                  m.id === selectedModelId && 'bg-accent/10',
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-foreground">{m.label}</span>
                  <span className="text-muted font-mono">{m.sizeGB}GB</span>
                </div>
                <p className="text-muted leading-snug">{m.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Load button / status */}
      {loaded ? (
        <div className="flex items-center gap-1.5 text-[11px] text-success">
          <CheckCircle size={12} />
          <span>Model loaded · ready</span>
        </div>
      ) : loadProgress ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span className="truncate">{loadProgress.text}</span>
            <span className="shrink-0 ml-2 font-mono">{progressPct}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={handleLoad}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 btn-primary text-xs rounded-lg py-1.5"
        >
          <Download size={12} />
          <span>Load model ({selectedModel.sizeGB}GB · cached after first load)</span>
        </button>
      )}

      {/* WebGPU hint */}
      {!loaded && !loadProgress && (
        <p className="text-[10px] text-muted leading-snug">
          Runs 100% in your browser via WebGPU. Requires Chrome 113+ or Edge 113+.
          No API key, no server, no cost.
        </p>
      )}
    </div>
  );
}
