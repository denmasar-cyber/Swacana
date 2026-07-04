/**
 * SWACANA v2 — Server-side Ollama AI Engine
 *
 * Runs Ollama on VPS for LLM inference.
 * User controls which models to pull and use.
 * Supports streaming, embeddings, and vision models.
 *
 * Architecture:
 * - Ollama runs on VPS (localhost:11434)
 * - Next.js API routes proxy requests to Ollama
 * - Client never talks to Ollama directly (keeps it hidden)
 */

// ─── Configuration ──────────────────────────────────────────────────────────

const OLLAMA_BASE = process.env.OLLAMA_HOST || 'http://localhost:11434';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

export interface GenerateOptions {
  model?: string;
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── Default Models ─────────────────────────────────────────────────────────

export const RECOMMENDED_MODELS = [
  {
    name: 'qwen3:1.8b',
    description: 'Fast & lightweight — good for quick notes',
    size: '~1.1GB',
    useCase: 'Quick summaries, simple chat',
  },
  {
    name: 'llama3.2:3b',
    description: 'Balanced — good quality on most hardware',
    size: '~2.0GB',
    useCase: 'Analysis, moderate reasoning',
  },
  {
    name: 'phi3.5:3.8b',
    description: 'Smart reasoning — excellent for analysis',
    size: '~2.2GB',
    useCase: 'Deep analysis, causal reasoning',
  },
  {
    name: 'gemma2:2b',
    description: 'Efficient — great instruction following',
    size: '~1.6GB',
    useCase: 'Editing, structured output',
  },
  {
    name: 'nomic-embed-text',
    description: 'Embedding model for RAG',
    size: '~274MB',
    useCase: 'Vector embeddings (required for RAG)',
  },
] as const;

export const DEFAULT_MODEL = 'qwen3:1.8b';
export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

// ─── Health Check ───────────────────────────────────────────────────────────

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Model Management ───────────────────────────────────────────────────────

export async function listModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.error('[Ollama] listModels failed:', err);
    return [];
  }
}

export async function pullModel(
  modelName: string,
  onProgress?: (status: string) => void,
): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
  });

  if (!res.ok) {
    throw new Error(`Failed to pull model: ${res.status}`);
  }

  // Read streaming response for progress
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n').filter(Boolean)) {
        try {
          const status = JSON.parse(line);
          onProgress?.(status.status || 'pulling');
        } catch { /* skip */ }
      }
    }
  }
}

export async function deleteModel(modelName: string): Promise<void> {
  await fetch(`${OLLAMA_BASE}/api/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
  });
}

// ─── Text Generation (Non-streaming) ────────────────────────────────────────

export async function generate(
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  const model = options.model || DEFAULT_MODEL;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: options.system ? `${options.system}\n\n${prompt}` : prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p,
        top_k: options.top_k,
        num_predict: options.num_predict ?? 2048,
        stop: options.stop,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama generate error: ${res.status}`);
  }

  const data = await res.json();
  return data.response || '';
}

// ─── Streaming Generation ───────────────────────────────────────────────────

export async function* streamGenerate(
  prompt: string,
  options: GenerateOptions = {},
): AsyncGenerator<string> {
  const model = options.model || DEFAULT_MODEL;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: options.system ? `${options.system}\n\n${prompt}` : prompt,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p,
        top_k: options.top_k,
        num_predict: options.num_predict ?? 2048,
        stop: options.stop,
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama stream error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const data = JSON.parse(line);
        if (data.response) yield data.response;
      } catch { /* skip malformed */ }
    }
  }
}

// ─── Chat API (OpenAI-compatible) ───────────────────────────────────────────

export async function chat(
  messages: ChatMessage[],
  options: GenerateOptions = {},
): Promise<string> {
  const model = options.model || DEFAULT_MODEL;

  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.num_predict ?? 2048,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama chat error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function* streamChat(
  messages: ChatMessage[],
  options: GenerateOptions = {},
): AsyncGenerator<string> {
  const model = options.model || DEFAULT_MODEL;

  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.num_predict ?? 2048,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama stream chat error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      const data = line.startsWith('data: ') ? line.slice(6) : line;
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* skip */ }
    }
  }
}

// ─── Embeddings ─────────────────────────────────────────────────────────────

export async function embedText(
  text: string,
  model = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama embedding error: ${res.status}`);
  }

  const data = await res.json();
  return data.embedding || [];
}

export async function embedBatch(
  texts: string[],
  model = DEFAULT_EMBEDDING_MODEL,
  onProgress?: (current: number, total: number) => void,
): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    const embedding = await embedText(texts[i], model);
    results.push(embedding);
    onProgress?.(i + 1, texts.length);

    // Small delay to avoid overwhelming Ollama
    if (i < texts.length - 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return results;
}

// ─── System Prompt Templates ────────────────────────────────────────────────

export const SYSTEM_PROMPTS = {
  default: `You are a helpful, balanced, and neutral AI assistant for analysis. Be conversational, human, and warm. Use the attached data context if provided and relevant.`,

  analitis: `You are a cold, scientific, and analytical AI mediator. Analyze user input objectively. Focus on root causes, data-driven insights, and structured reasoning. Cite sources using [number] notation.`,

  ringkas: `You are a concise AI assistant. Provide brief, to-the-point answers. Use bullet points when possible. Be direct. Cite sources using [number] notation.`,

  edit: `You are an expert editor. Improve the following text by fixing grammar, spelling, clarity, and structure. Preserve the original meaning and tone. Return ONLY the improved text without any explanation.`,

  review: `You are an expert reviewer. Analyze the following text and provide structured feedback covering:\n1. Grammar & Spelling issues found\n2. Clarity & Structure rating\n3. Completeness & accuracy notes\n4. Specific suggestions for improvement`,

  scrap: `You are a data extraction specialist. Extract and organize structured information from the following text. Identify:\n- Key entities & terms\n- Dates & deadlines\n- Action items & decisions\n- References & sources cited\n- Main topics & themes`,

  guardrail: `You are a cold, scientific, and completely humble AI mediator. Analyze user input objectively and without emotional bias.

Your response MUST contain exactly two parts:
1. Your analytical reasoning inside <think>...</think> tags.
2. A valid JSON array inside a \`\`\`json code block.

JSON Schema (output an array of these objects):
[
  {
    "id": "<unique string id>",
    "parentId": "<parent id or null for root>",
    "nodeType": "ROOT_CAUSE" | "DIAGNOSIS" | "IMPACT" | "MITIGATION",
    "label": "<3-5 word summary>",
    "details": "<comprehensive analysis with [Source: Theory Name]>",
    "targetDate": "<YYYY-MM-DD for MITIGATION nodes, null otherwise>",
    "status": "PENDING"
  }
]

Rules:
- Always produce at least 1 ROOT_CAUSE and 2-4 child nodes.
- Never hallucinate without basis.
- Cite a real theory or framework in every "details" field.
- Output ONLY the two parts above.`,
} as const;
