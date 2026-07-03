'use client';

import type { InitProgressReport, MLCEngine } from '@mlc-ai/web-llm';

// ─── Available free models (ordered smallest → largest) ──────────────────────
export interface ModelOption {
  id: string;          // WebLLM model id
  label: string;       // display name
  sizeGB: number;      // approximate download size
  description: string;
}

export const FREE_MODELS: ModelOption[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 · 1B (fastest)',
    sizeGB: 0.7,
    description: 'Meta · very fast, low quality, good for testing',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 · 3B (balanced)',
    sizeGB: 1.8,
    description: 'Meta · good quality, runs on most GPUs',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 Mini · 3.8B (smart)',
    sizeGB: 2.2,
    description: 'Microsoft · excellent reasoning for its size',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 · 2B (efficient)',
    sizeGB: 1.5,
    description: 'Google · very efficient, great instruction following',
  },
];

export const DEFAULT_MODEL_ID = FREE_MODELS[0].id;

// ─── Engine singleton ─────────────────────────────────────────────────────────
let engine: MLCEngine | null = null;
let currentModelId: string | null = null;
let loadingPromise: Promise<MLCEngine> | null = null;

export type LoadProgress = {
  text: string;
  progress: number; // 0–1
};

export async function getEngine(
  modelId: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<MLCEngine> {
  // Reuse engine if same model already loaded
  if (engine && currentModelId === modelId) return engine;

  // If a load is already in progress for the same model, wait for it
  if (loadingPromise && currentModelId === modelId) return loadingPromise;

  // Reset for new model
  if (engine) {
    await engine.unload();
    engine = null;
  }

  currentModelId = modelId;

  loadingPromise = (async () => {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

    const newEngine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report: InitProgressReport) => {
        onProgress?.({
          text: report.text,
          progress: report.progress,
        });
      },
    });

    engine = newEngine;
    loadingPromise = null;
    return engine;
  })();

  return loadingPromise;
}

export function isEngineLoaded(modelId: string): boolean {
  return engine !== null && currentModelId === modelId;
}

export function getCurrentModelId(): string | null {
  return currentModelId;
}

// ─── Streaming inference ──────────────────────────────────────────────────────
export async function streamWebLLM(
  systemPrompt: string,
  userMessage: string,
  modelId: string,
  onChunk: (text: string) => void,
  onProgress: (p: LoadProgress) => void,
  signal: AbortSignal,
): Promise<void> {
  const eng = await getEngine(modelId, onProgress);

  const chunks = await eng.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  });

  for await (const chunk of chunks) {
    if (signal.aborted) break;
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) onChunk(delta);
  }
}
