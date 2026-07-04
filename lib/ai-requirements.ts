/**
 * AI Requirements File — Model Registry & Auto-Download System
 *
 * Central registry for all AI models used in the application.
 * Provides auto-download on user entry, model status tracking,
 * and a unified interface for model management.
 *
 * Models are automatically loaded when:
 *   1. User enters the app (Dashboard)
 *   2. User opens a Note workspace
 *   3. Any AI feature is triggered
 */

'use client';

import {
  type LoadProgress,
  getEngine,
  isEngineLoaded,
  FREE_MODELS,
} from '@/lib/webllm-client';

import {
  initEmbeddingEngine,
  isEmbeddingEngineReady,
  EMBEDDING_MODEL,
} from '@/lib/embedding-engine';

// ─── AI Requirements Registry ──────────────────────────────────────────────

export interface AIModelEntry {
  id: string;
  name: string;
  type: 'generation' | 'embedding';
  size: string; // e.g., "0.7GB", "90MB"
  description: string;
  required: boolean; // Must be loaded for core functionality
  autoLoad: boolean; // Automatically loads when user enters
  loaded: boolean;
  loading: boolean;
}

// The master AI requirements file — single source of truth for all models
export const AI_REQUIREMENTS: AIModelEntry[] = [
  // Generation Models (WebLLM / MLC format)
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B (Fast)',
    type: 'generation',
    size: '0.7GB',
    description: 'Fast generation, good for testing & simple chat',
    required: false,
    autoLoad: false,
    loaded: false,
    loading: false,
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B (Balanced)',
    type: 'generation',
    size: '1.8GB',
    description: 'Good quality, runs on most GPUs',
    required: false,
    autoLoad: false,
    loaded: false,
    loading: false,
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Mini (Smart)',
    type: 'generation',
    size: '2.2GB',
    description: 'Excellent reasoning, good for analysis',
    required: true,
    autoLoad: true,
    loaded: false,
    loading: false,
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B (Efficient)',
    type: 'generation',
    size: '1.5GB',
    description: 'Very efficient, great instruction following',
    required: false,
    autoLoad: false,
    loaded: false,
    loading: false,
  },
  // Embedding Model (Transformers.js / ONNX)
  {
    id: EMBEDDING_MODEL.id,
    name: EMBEDDING_MODEL.label,
    type: 'embedding',
    size: '~90MB',
    description: 'Multilingual embedding for RAG — 384-dim vectors',
    required: true, // Required for RAG pipeline
    autoLoad: true, // Auto-load on entry
    loaded: false,
    loading: false,
  },
];

// ─── Model Manager ─────────────────────────────────────────────────────────

export type ModelStatusCallback = (
  modelId: string,
  status: { loaded: boolean; loading: boolean; progress?: LoadProgress },
) => void;

const listeners = new Set<ModelStatusCallback>();

export function subscribeModelStatus(cb: ModelStatusCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyModelStatus(
  modelId: string,
  status: { loaded: boolean; loading: boolean; progress?: LoadProgress },
) {
  for (const cb of listeners) {
    try {
      cb(modelId, status);
    } catch {
      // ignore
    }
  }
}

// ─── Auto-Download System ─────────────────────────────────────────────────

let autoLoadInitiated = false;

/**
 * Auto-load all required models when user enters the app.
 * Called once from the Dashboard or Layout.
 */
export async function autoLoadRequiredModels(
  onProgress?: (modelId: string, progress: LoadProgress) => void,
): Promise<void> {
  if (autoLoadInitiated) return;
  autoLoadInitiated = true;

  console.log('[AI-Requirements] Auto-loading required models...');

  const embeddingReq = AI_REQUIREMENTS.find(
    (r) => r.type === 'embedding' && r.autoLoad,
  );
  const generationReq = AI_REQUIREMENTS.find(
    (r) => r.type === 'generation' && r.autoLoad,
  );

  // Load both models in parallel for faster startup
  const tasks: Promise<void>[] = [];

  // Embedding model task
  if (embeddingReq && !isEmbeddingEngineReady()) {
    tasks.push(
      (async () => {
        try {
          notifyModelStatus(embeddingReq.id, { loaded: false, loading: true });
          console.log('[AI-Requirements] Loading embedding model...');
          await initEmbeddingEngine((progress) => {
            onProgress?.(embeddingReq.id, {
              text: progress.message || `Embedding: ${progress.current}/${progress.total}`,
              progress: progress.total > 0 ? progress.current / progress.total : 0,
            });
          });
          notifyModelStatus(embeddingReq.id, { loaded: true, loading: false });
          console.log('[AI-Requirements] Embedding model ready');
        } catch (err) {
          console.warn('[AI-Requirements] Embedding model load failed:', err);
          notifyModelStatus(embeddingReq.id, {
            loaded: false,
            loading: false,
            progress: { text: `Gagal: ${(err as Error).message}`, progress: 0 },
          });
        }
      })(),
    );
  }

  // Generation model task — delegate state management to loadGenerationModel
  if (generationReq && !isEngineLoaded(generationReq.id)) {
    tasks.push(
      (async () => {
        try {
          notifyModelStatus(generationReq.id, { loaded: false, loading: true });
          console.log(`[AI-Requirements] Loading generation model: ${generationReq.name}...`);
          await loadGenerationModel(generationReq.id, (p) => {
            onProgress?.(generationReq.id, p);
            notifyModelStatus(generationReq.id, { loaded: false, loading: true, progress: p });
          });
          console.log(`[AI-Requirements] Generation model ready: ${generationReq.name}`);
        } catch (err) {
          console.warn('[AI-Requirements] Generation model load failed:', err);
          notifyModelStatus(generationReq.id, {
            loaded: false,
            loading: false,
            progress: { text: `Gagal memuat model: ${(err as Error).message}`, progress: 0 },
          });
        }
      })(),
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  console.log('[AI-Requirements] Auto-load complete');
}

/**
 * Reset auto-load flag (useful for testing).
 */
export function resetAutoLoad() {
  autoLoadInitiated = false;
}

// ─── Manual Model Load ────────────────────────────────────────────────────

export async function loadGenerationModel(
  modelId: string,
  onProgress?: (progress: LoadProgress) => void,
): Promise<void> {
  const req = AI_REQUIREMENTS.find((r) => r.id === modelId);
  if (!req) throw new Error(`Unknown model: ${modelId}`);
  if (req.loaded || req.loading) return;

  req.loading = true;
  notifyModelStatus(modelId, { loaded: false, loading: true });

  try {
    await getEngine(modelId, (p) => {
      onProgress?.(p);
      notifyModelStatus(modelId, { loaded: false, loading: true, progress: p });
    });
    req.loaded = true;
    req.loading = false;
    notifyModelStatus(modelId, { loaded: true, loading: false });
  } catch (err) {
    req.loading = false;
    notifyModelStatus(modelId, {
      loaded: false,
      loading: false,
      progress: {
        text: `Failed: ${(err as Error).message}`,
        progress: 0,
      },
    });
    throw err;
  }
}

/**
 * Manually load the embedding model.
 */
export async function loadEmbeddingModel(
  onProgress?: (progress: { current: number; total: number; message?: string }) => void,
): Promise<void> {
  const req = AI_REQUIREMENTS.find((r) => r.type === 'embedding');
  if (!req) throw new Error('Embedding model not found in registry');
  if (req.loaded) return;
  if (req.loading) {
    console.log('[AI-Requirements] Embedding model already loading, waiting...');
    // Wait for existing load to complete
    while (isEmbeddingEngineReady() === false && req.loading) {
      await new Promise((r) => setTimeout(r, 500));
    }
    return;
  }

  req.loading = true;
  notifyModelStatus(req.id, { loaded: false, loading: true });

  try {
    await initEmbeddingEngine((progress) => {
      onProgress?.({
        current: progress.current,
        total: progress.total,
        message: progress.message,
      });
      notifyModelStatus(req.id, {
        loaded: false,
        loading: true,
        progress: {
          text: progress.message || 'Loading...',
          progress: progress.total > 0 ? progress.current / progress.total : 0,
        },
      });
    });
    req.loaded = true;
    req.loading = false;
    notifyModelStatus(req.id, { loaded: true, loading: false });
    console.log('[AI-Requirements] Embedding model ready');
  } catch (err) {
    req.loading = false;
    console.warn('[AI-Requirements] Embedding model load failed:', err);
    notifyModelStatus(req.id, {
      loaded: false,
      loading: false,
      progress: {
        text: `Failed: ${(err as Error).message}`,
        progress: 0,
      },
    });
    throw err;
  }
}

export function getModelStatus(): AIModelEntry[] {
  // Sync with actual engine status
  for (const req of AI_REQUIREMENTS) {
    if (req.type === 'generation') {
      req.loaded = isEngineLoaded(req.id);
      // Also check if this is the model currently being loaded
      if (!req.loaded && !req.loading) {
        // Check if engine is currently loading this model
        req.loading = false; // Will be set when loadGenerationModel is called
      }
    }
    if (req.type === 'embedding') {
      req.loaded = isEmbeddingEngineReady();
    }
  }
  return AI_REQUIREMENTS;
}

export function isAnyModelLoading(): boolean {
  return AI_REQUIREMENTS.some((r) => r.loading);
}

export function getModelsLoadedCount(): { loaded: number; loading: number; total: number } {
  const total = AI_REQUIREMENTS.length;
  let loaded = 0;
  let loading = 0;
  for (const req of AI_REQUIREMENTS) {
    if (req.type === 'generation') {
      req.loaded = isEngineLoaded(req.id);
    }
    if (req.type === 'embedding') {
      req.loaded = isEmbeddingEngineReady();
    }
    if (req.loaded) loaded++;
    if (req.loading) loading++;
  }
  return { loaded, loading, total };
}
