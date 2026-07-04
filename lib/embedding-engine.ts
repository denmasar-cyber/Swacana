'use client';

/**
 * Embedding Engine — in-browser text embeddings via Transformers.js
 *
 * Uses Xenova/all-MiniLM-L6-v2 (384-dim) running in a Web Worker
 * to avoid blocking the main thread during embedding.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EmbeddingProgress {
  current: number;
  total: number;
  phase: 'loading' | 'embedding' | 'done' | 'error';
  message?: string;
}

export type EmbeddingCallback = (progress: EmbeddingProgress) => void;

// ─── Embedding Model Info ──────────────────────────────────────────────────

export const EMBEDDING_MODEL = {
  id: 'Xenova/all-MiniLM-L6-v2',
  dim: 384,
  label: 'MiniLM-L6-v2 (Embedding)',
  sizeMB: 90,
  description: 'Multilingual embedding model for RAG — 384-dim vectors',
} as const;

// ─── Singleton Web Worker ─────────────────────────────────────────────────

let worker: Worker | null = null;
let isWorkerLoading = false;
let workerReady = false;
let initPromise: Promise<void> | null = null;
let taskId = 0;
const pendingTasks = new Map<
  number,
  {
    resolve: (embedding: number[]) => void;
    reject: (err: Error) => void;
  }
>();

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('./embedding.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent) => {
    const { type, taskId: tid, embedding, error, progress } = event.data;

    if (type === 'ready') {
      workerReady = true;
      isWorkerLoading = false;
      return;
    }

    if (type === 'progress') {
      // Could broadcast progress here
      return;
    }

    if (type === 'error') {
      const pending = pendingTasks.get(tid);
      if (pending) {
        pending.reject(new Error(error || 'Embedding worker error'));
        pendingTasks.delete(tid);
      }
      return;
    }

    if (type === 'result') {
      const pending = pendingTasks.get(tid);
      if (pending) {
        pending.resolve(embedding);
        pendingTasks.delete(tid);
      }
    }
  };

  worker.onerror = (err) => {
    console.error('[EmbeddingEngine] Worker error:', err);
    workerReady = false;
  };

  return worker;
}

export async function initEmbeddingEngine(
  onProgress?: EmbeddingCallback,
): Promise<void> {
  if (initPromise) return initPromise;

  isWorkerLoading = true;
  onProgress?.({ current: 0, total: 1, phase: 'loading', message: 'Loading embedding model...' });

  initPromise = new Promise<void>((resolve, reject) => {
    try {
      const w = getWorker();
      const timeout = setTimeout(() => {
        if (!workerReady) {
          reject(new Error('Embedding model load timed out'));
        }
      }, 60000);

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'ready') {
          clearTimeout(timeout);
          workerReady = true;
          isWorkerLoading = false;
          onProgress?.({
            current: 1,
            total: 1,
            phase: 'done',
            message: 'Embedding model ready',
          });
          w.removeEventListener('message', handler);
          resolve();
        }
        if (event.data.type === 'progress' && event.data.progress) {
          onProgress?.({
            current: event.data.progress.current || 0,
            total: event.data.progress.total || 1,
            phase: 'loading',
            message: event.data.progress.message,
          });
        }
      };

      w.addEventListener('message', handler);
      w.postMessage({ type: 'init', modelId: EMBEDDING_MODEL.id });
    } catch (err) {
      isWorkerLoading = false;
      onProgress?.({
        current: 0,
        total: 1,
        phase: 'error',
        message: `Failed to init embedding: ${(err as Error).message}`,
      });
      reject(err);
    }
  });

  return initPromise;
}

export async function embedText(text: string): Promise<number[]> {
  if (!workerReady) {
    await initEmbeddingEngine();
  }

  const w = getWorker();
  const id = ++taskId;

  return new Promise<number[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingTasks.delete(id);
      reject(new Error('Embedding request timed out'));
    }, 30000);

    pendingTasks.set(id, {
      resolve: (embedding: number[]) => {
        clearTimeout(timeout);
        resolve(embedding);
      },
      reject: (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    w.postMessage({ type: 'embed', taskId: id, text });
  });
}

export async function embedBatch(
  texts: string[],
  onProgress?: EmbeddingCallback,
): Promise<number[][]> {
  if (!workerReady) {
    await initEmbeddingEngine();
  }

  const results: number[][] = [];
  const batchSize = 8;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map((t) => embedText(t));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    onProgress?.({
      current: Math.min(i + batchSize, texts.length),
      total: texts.length,
      phase: 'embedding',
      message: `Embedding ${Math.min(i + batchSize, texts.length)}/${texts.length} chunks...`,
    });
  }

  onProgress?.({
    current: texts.length,
    total: texts.length,
    phase: 'done',
    message: 'Embedding complete',
  });

  return results;
}

export function isEmbeddingEngineReady(): boolean {
  return workerReady;
}

export function getEmbeddingModelStatus(): {
  ready: boolean;
  loading: boolean;
  modelId: string;
} {
  return {
    ready: workerReady,
    loading: isWorkerLoading,
    modelId: EMBEDDING_MODEL.id,
  };
}
