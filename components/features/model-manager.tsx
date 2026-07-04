'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Download, CheckCircle, Cpu, ChevronDown, AlertCircle,
  Loader2, Brain, Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AI_REQUIREMENTS,
  getModelStatus,
  loadGenerationModel,
  loadEmbeddingModel,
  autoLoadRequiredModels,
  type AIModelEntry,
} from '@/lib/ai-requirements';
import { isEngineLoaded } from '@/lib/webllm-client';
import { isEmbeddingEngineReady, EMBEDDING_MODEL } from '@/lib/embedding-engine';

interface Props {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  onLoadProgress?: (progress: { text: string; progress: number } | null) => void;
}

export default function ModelManager({ selectedModelId, onModelChange, onLoadProgress }: Props) {
  const [activeTab, setActiveTab] = useState<'generation' | 'embedding'>('generation');
  const [models, setModels] = useState<AIModelEntry[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ modelId: string; text: string; progress: number } | null>(null);

  // Refresh model status periodically
  const refreshModels = useCallback(() => {
    const status = getModelStatus();
    setModels([...status]);
  }, []);

  useEffect(() => {
    refreshModels();
    const interval = setInterval(refreshModels, 2000);
    return () => clearInterval(interval);
  }, [refreshModels]);

  const handleLoadModel = useCallback(async (modelId: string) => {
    if (loadingId) return;
    setLoadingId(modelId);

    try {
      if (modelId === EMBEDDING_MODEL.id) {
        // Load embedding model via Transformers.js
        await loadEmbeddingModel((progress) => {
          setLoadProgress({
            modelId,
            text: progress.message || 'Loading embedding model...',
            progress: progress.total > 0 ? progress.current / progress.total : 0,
          });
          if (onLoadProgress) {
            onLoadProgress({
              text: progress.message || 'Loading embedding model...',
              progress: progress.total > 0 ? progress.current / progress.total : 0,
            });
          }
        });
      } else {
        // Load generation model via WebLLM
        await loadGenerationModel(modelId, (progress) => {
          setLoadProgress({
            modelId,
            text: progress.text,
            progress: progress.progress,
          });
          onLoadProgress?.(progress);
        });
      }
      setLoadProgress(null);
      refreshModels();
    } catch (err) {
      console.error('[ModelManager] Load failed:', err);
      setLoadProgress({
        modelId,
        text: `Failed: ${(err as Error).message}`,
        progress: 0,
      });
    } finally {
      setLoadingId(null);
      refreshModels();
    }
  }, [loadingId, onLoadProgress, refreshModels]);

  const generationModels = models.filter((m) => m.type === 'generation');
  const embeddingModels = models.filter((m) => m.type === 'embedding');

  const progressForModel = (modelId: string) =>
    loadProgress?.modelId === modelId ? loadProgress : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border shrink-0">
        <button onClick={() => setActiveTab('generation')}
          className={cn('flex-1 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            activeTab === 'generation' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-foreground')}>
          <Brain size={12} /> Generation
        </button>
        <button onClick={() => setActiveTab('embedding')}
          className={cn('flex-1 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            activeTab === 'embedding' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-foreground')}>
          <Database size={12} /> Embedding
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activeTab === 'generation' && generationModels.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted text-xs">
            <Cpu size={24} className="mb-2 opacity-30" />
            <p>No generation models available.</p>
          </div>
        )}

        {activeTab === 'generation' && generationModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={model.id === selectedModelId}
            isLoading={loadingId === model.id}
            progress={progressForModel(model.id)}
            onSelect={() => onModelChange(model.id)}
            onLoad={() => handleLoadModel(model.id)}
          />
        ))}

        {activeTab === 'embedding' && embeddingModels.map((model) => {
          const isReady = isEmbeddingEngineReady();
          const isLoadingEmbedding = loadingId === model.id;
          const embedProgress = progressForModel(model.id);
          return (
            <ModelCard
              key={model.id}
              model={{ ...model, loaded: isReady, loading: isLoadingEmbedding }}
              isSelected={false}
              isLoading={isLoadingEmbedding}
              progress={embedProgress}
              onSelect={() => {}}
              onLoad={() => handleLoadModel(model.id)}
            />
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-border shrink-0">
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>{models.filter((m) => m.loaded).length}/{models.length} models ready</span>
          <span className="text-accent">{isEmbeddingEngineReady() ? 'RAG ready' : 'RAG not ready'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Model Card ────────────────────────────────────────────────────────────

function ModelCard({
  model,
  isSelected,
  isLoading,
  progress,
  onSelect,
  onLoad,
}: {
  model: AIModelEntry;
  isSelected: boolean;
  isLoading: boolean;
  progress: { text: string; progress: number } | null;
  onSelect: () => void;
  onLoad: () => void;
}) {
  const progressPct = progress ? Math.round(progress.progress * 100) : 0;

  return (
    <div className={cn('rounded-lg border transition-all p-2.5',
      isSelected ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface hover:border-border/80')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs font-medium truncate', isSelected ? 'text-white' : 'text-foreground')}>
              {model.name}
            </span>
            {model.required && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-accent/20 text-accent shrink-0">Required</span>
            )}
          </div>
          <p className="text-[10px] text-muted mt-0.5">{model.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface2 text-muted font-mono">{model.size}</span>
            {model.loaded && (
              <span className="text-[9px] text-success flex items-center gap-0.5">
                <CheckCircle size={8} /> Loaded ✓
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {model.loaded ? (
            <div className="flex gap-1">
              {model.type === 'generation' && (
                <button onClick={onSelect}
                  className={cn('px-2 py-1 text-[10px] rounded transition-colors',
                    isSelected ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-surface2 text-muted hover:text-foreground border border-border')}>
                  {isSelected ? 'Active' : 'Select'}
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-1 text-[10px] text-accent">
              <Loader2 size={10} className="animate-spin" />
              <span>{progressPct}%</span>
            </div>
          ) : progress && progress.progress === 0 ? (
            <span className="text-[9px] text-danger flex items-center gap-1"><AlertCircle size={8} /> Failed</span>
          ) : (
            <button onClick={onLoad}
              className="px-2 py-1 text-[10px] rounded bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20 transition-colors">
              <Download size={10} className="inline mr-1" /> Load
            </button>
          )}
        </div>
      </div>

      {progress && progress.progress > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[9px] text-muted mb-0.5">
            <span className="truncate">{progress.text}</span>
            <span className="shrink-0 ml-2 font-mono">{progressPct}%</span>
          </div>
          <div className="h-1 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
