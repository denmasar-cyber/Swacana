/**
 * SWACANA — Text Embedding Engine
 *
 * Uses Transformers.js to generate text embeddings 100% locally.
 * Model: all-MiniLM-L6-v2 (384-dim, multilingual, ~90MB)
 *
 * No API keys, no cloud calls, 100% free.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EmbeddingProgress {
  current: number;
  total: number;
  phase: 'loading' | 'embedding' | 'done' | 'error';
  message?: string;
}

export type EmbeddingCallback = (progress: EmbeddingProgress) => void;

// ─── Configuration ─────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

let _pipeline: any = null;
let _ready = false;
let _loading = false;

// ─── Initialize Embedding Model ────────────────────────────────────────────

async function getEmbeddingPipeline() {
  if (_pipeline) return _pipeline;

  const { pipeline } = await import('@xenova/transformers');

  _pipeline = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    quantized: true,
  });

  return _pipeline;
}

export async function initEmbeddingEngine(
  onProgress?: EmbeddingCallback,
): Promise<void> {
  if (_ready) return;
  if (_loading) {
    while (_loading) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return;
  }

  _loading = true;
  onProgress?.({ current: 0, total: 1, phase: 'loading', message: 'Memuat model embedding...' });

  try {
    await getEmbeddingPipeline();
    _ready = true;
    _loading = false;
    onProgress?.({ current: 1, total: 1, phase: 'done', message: 'Model embedding siap!' });
  } catch (err) {
    _loading = false;
    onProgress?.({ current: 0, total: 1, phase: 'error', message: `Gagal: ${(err as Error).message}` });
    throw err;
  }
}

// ─── Generate Embedding ────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();

  const result = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Extract the embedding vector
  const data = result.data as Float32Array;
  return Array.from(data);
}

// ─── Batch Embedding ───────────────────────────────────────────────────────

export async function embedBatch(
  texts: string[],
  onProgress?: EmbeddingCallback,
): Promise<number[][]> {
  const results: number[][] = [];
  const batchSize = 4; // Small batch for CPU efficiency

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map((t) => embedText(t));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    onProgress?.({
      current: Math.min(i + batchSize, texts.length),
      total: texts.length,
      phase: 'embedding',
      message: `Embedding ${Math.min(i + batchSize, texts.length)}/${texts.length}...`,
    });
  }

  onProgress?.({
    current: texts.length,
    total: texts.length,
    phase: 'done',
    message: 'Embedding selesai!',
  });

  return results;
}

// ─── Status ─────────────────────────────────────────────────────────────────

export function isEmbeddingReady(): boolean {
  return _ready;
}

export function getEmbeddingInfo() {
  return {
    modelId: EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    ready: _ready,
    loading: _loading,
  };
}

// ─── Token Estimation ──────────────────────────────────────────────────────

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// ─── Chunk & Embed Utility ─────────────────────────────────────────────────

export interface ChunkResult {
  text: string;
  tokenCount: number;
}

const CHUNK_SIZE = 512; // chars
const CHUNK_OVERLAP = 64;

export function splitIntoChunks(text: string): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: ChunkResult[] = [];

  if (text.length <= CHUNK_SIZE) {
    return [{ text: text.trim(), tokenCount: estimateTokenCount(text) }];
  }

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    let chunkText = text.slice(start, end).trim();

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkText.length * 0.4) {
        chunkText = chunkText.slice(0, breakPoint + 1);
      }
    }

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        tokenCount: estimateTokenCount(chunkText),
      });
    }

    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}
