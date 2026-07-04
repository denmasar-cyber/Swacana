/**
 * SWACANA — AI Inference Engine
 *
 * Uses Transformers.js ( @xenova/transformers ) for 100% local LLM inference.
 * Zero API keys, zero cloud calls, zero cost.
 *
 * Also supports Ollama as optional fallback for better quality.
 *
 * Architecture:
 * 1. Try Ollama (if installed & running on localhost:11434)
 * 2. Fallback to Transformers.js (always available, no setup needed)
 */



// ─── Types ─────────────────────────────────────────────────────────────────

export interface LLMConfig {
  /** Model to use for Transformers.js */
  localModelId?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
}

export interface LoadProgress {
  text: string;
  progress: number; // 0-1
}

// ─── Configuration ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LLMConfig = {
  localModelId: 'Xenova/LaMini-Flan-T5-783M',
  maxTokens: 256,
  temperature: 0.7,
};

let _genPipeline: any = null;
let _modelLoading = false;
let _modelReady = false;

// ─── Transformers.js Dynamic Import ────────────────────────────────────────

async function getTransformers() {
  try {
    const mod = await import('@xenova/transformers');
    return mod;
  } catch {
    throw new Error(
      'Transformers.js tidak tersedia. Jalankan "npm install" di folder swacana-cli.'
    );
  }
}

// ─── Ollama Check ──────────────────────────────────────────────────────────

let _ollamaAvailable: boolean | null = null;

export async function isOllamaAvailable(): Promise<boolean> {
  if (_ollamaAvailable !== null) return _ollamaAvailable;

  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    _ollamaAvailable = res.ok;
    return _ollamaAvailable;
  } catch {
    _ollamaAvailable = false;
    return false;
  }
}

export function resetOllamaCheck() {
  _ollamaAvailable = null;
}

// ─── Generate with Ollama ──────────────────────────────────────────────────

async function generateWithOllama(
  prompt: string,
  systemPrompt?: string,
  config?: Partial<LLMConfig>,
): Promise<string> {
  const model = 'llama3.2:3b'; // Default Ollama model

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
        options: {
          temperature: config?.temperature ?? DEFAULT_CONFIG.temperature,
          num_predict: config?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

    const data = await res.json() as { response: string };
    return data.response || '';
  } catch (err) {
    throw new Error(
      `Ollama gagal: ${(err as Error).message}. Coba install Ollama dari https://ollama.com`
    );
  }
}

// ─── Generate with Transformers.js ─────────────────────────────────────────

async function generateWithTransformers(
  prompt: string,
  systemPrompt?: string,
  config?: Partial<LLMConfig>,
  onProgress?: (p: LoadProgress) => void,
): Promise<string> {
  const tf = await getTransformers();

  if (!_genPipeline) {
    const modelId = config?.localModelId ?? DEFAULT_CONFIG.localModelId;
    onProgress?.({ text: `Memuat model ${modelId}...`, progress: 0 });

    _genPipeline = await tf.pipeline('text2text-generation', modelId, {
      quantized: true,
    });

    onProgress?.({ text: 'Model siap!', progress: 1 });
  }

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const result = await _genPipeline(fullPrompt, {
    max_new_tokens: config?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    temperature: config?.temperature ?? DEFAULT_CONFIG.temperature,
    do_sample: true,
  });

  return (result as { generated_text: string }[])?.[0]?.generated_text || '';
}

// ─── Main Generate Function ────────────────────────────────────────────────

export async function generate(
  prompt: string,
  systemPrompt?: string,
  config?: Partial<LLMConfig>,
  onProgress?: (p: LoadProgress) => void,
): Promise<string> {
  // Try Ollama first (better quality)
  const ollamaOk = await isOllamaAvailable();
  if (ollamaOk) {
    try {
      return await generateWithOllama(prompt, systemPrompt, config);
    } catch (err) {
      console.warn('[AI] Ollama gagal, fallback ke Transformers.js:', (err as Error).message);
      // Reset cache so we don't keep trying Ollama
      resetOllamaCheck();
    }
  }

  // Fallback to Transformers.js
  return generateWithTransformers(prompt, systemPrompt, config, onProgress);
}

// ─── Quick Generate (no config needed) ─────────────────────────────────────

export async function quickGenerate(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  return generate(prompt, systemPrompt, { maxTokens: 128 });
}

// ─── Load Model Only ───────────────────────────────────────────────────────

export async function loadModel(
  onProgress?: (p: LoadProgress) => void,
): Promise<void> {
  if (_modelReady) return;
  if (_modelLoading) {
    // Wait for existing load
    while (_modelLoading) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return;
  }

  _modelLoading = true;

  try {
    const ollamaOk = await isOllamaAvailable();
    if (ollamaOk) {
      onProgress?.({ text: 'Ollama terdeteksi! Siap pakai.', progress: 1 });
      _modelReady = true;
      _modelLoading = false;
      return;
    }

    // Load Transformers.js model
    const tf = await getTransformers();
    const modelId = DEFAULT_CONFIG.localModelId!;

    onProgress?.({ text: `Mendownload model AI: ${modelId}...`, progress: 0.1 });
    onProgress?.({ text: 'Model besar (~1.5GB). Hanya sekali download.', progress: 0.3 });

    _genPipeline = await tf.pipeline('text2text-generation', modelId, {
      quantized: true,
      progress_callback: (p: { loaded: number; total: number; name: string }) => {
        const progress = p.total > 0 ? (0.3 + (p.loaded / p.total) * 0.6) : 0.3;
        onProgress?.({ text: `Download: ${Math.round(p.loaded / 1024 / 1024)}MB / ${Math.round(p.total / 1024 / 1024)}MB`, progress });
      },
    });

    _modelReady = true;
    onProgress?.({ text: '✅ Model AI siap!', progress: 1 });
  } catch (err) {
    _modelLoading = false;
    throw err;
  }

  _modelLoading = false;
}

export function isModelReady(): boolean {
  return _modelReady || _ollamaAvailable === true;
}

export function getModelStatus(): { ready: boolean; loading: boolean; usingOllama: boolean } {
  return {
    ready: _modelReady || _ollamaAvailable === true,
    loading: _modelLoading,
    usingOllama: _ollamaAvailable === true,
  };
}
