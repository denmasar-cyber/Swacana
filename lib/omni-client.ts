import dagre from 'dagre';
import type { KiroCanvasNode } from './db';
import { streamWebLLM, type LoadProgress } from './webllm-client';

// ─── Guardrail System Prompt ──────────────────────────────────────────────────

export const STRICT_GUARDRAIL_PROMPT = `You are a cold, scientific, and completely humble AI mediator. Analyze user input objectively and without emotional bias.

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

Node type guide:
- ROOT_CAUSE: The fundamental root of the problem (use as tree root, parentId: null)
- DIAGNOSIS: Symptoms, contributing factors (parentId = ROOT_CAUSE id)
- IMPACT: Consequences and downstream effects (parentId = DIAGNOSIS id)
- MITIGATION: Actionable solutions with a targetDate (parentId = IMPACT or DIAGNOSIS id)

Rules:
- Always produce at least 1 ROOT_CAUSE and 2-4 child nodes.
- Never hallucinate without basis. State limitations in <think>.
- Cite a real theory or framework in every "details" field.
- Output ONLY the two parts above — no extra prose outside the tags/codeblock.`;

// ─── Ollama fallback (optional, when user has it running locally) ─────────────

interface OllamaEndpoint {
  name: string;
  url: string;
  format: 'ollama' | 'openai';
}

const OLLAMA_ENDPOINTS: OllamaEndpoint[] = [
  { name: 'Ollama',    url: 'http://localhost:11434/api/generate',       format: 'ollama'  },
  { name: 'Llama.cpp', url: 'http://localhost:8080/v1/chat/completions', format: 'openai'  },
  { name: 'LocalAI',   url: 'http://localhost:8081/v1/chat/completions', format: 'openai'  },
];

async function tryOllamaFallback(
  userMessage: string,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<boolean> {
  const fullPrompt = `${STRICT_GUARDRAIL_PROMPT}\n\nUser Input: ${userMessage}`;

  for (const endpoint of OLLAMA_ENDPOINTS) {
    try {
      const body =
        endpoint.format === 'ollama'
          ? JSON.stringify({ model: 'llama3', prompt: fullPrompt, stream: true })
          : JSON.stringify({
              model: 'llama3',
              messages: [{ role: 'user', content: fullPrompt }],
              stream: true,
            });

      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal,
      });

      if (!res.ok || !res.body) continue;

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
            const json = JSON.parse(data);
            const text = json.response ?? json.choices?.[0]?.delta?.content ?? '';
            if (text) onChunk(text);
          } catch { /* skip malformed */ }
        }
      }
      return true; // success
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      // try next endpoint
    }
  }
  return false;
}

// ─── Main stream function (WebLLM primary → Ollama fallback) ─────────────────

export async function streamLLM(
  userMessage: string,
  modelId: string,
  onChunk: (text: string) => void,
  signal: AbortSignal,
  onLoadProgress?: (p: LoadProgress) => void,
): Promise<void> {
  // Try WebLLM first (in-browser, always free)
  try {
    await streamWebLLM(
      STRICT_GUARDRAIL_PROMPT,
      userMessage,
      modelId,
      onChunk,
      onLoadProgress ?? (() => {}),
      signal,
    );
    return;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    console.warn('[omni-client] WebLLM failed, trying local Ollama fallback...', err);
  }

  // Fallback to local Ollama/Llama.cpp/LocalAI
  const ok = await tryOllamaFallback(userMessage, onChunk, signal);
  if (!ok) {
    throw new Error(
      'No AI engine available. Make sure your browser supports WebGPU (Chrome 113+), ' +
      'or run Ollama locally on port 11434.',
    );
  }
}

// ─── Incremental JSON Parser & Sanitizer ─────────────────────────────────────

export function sanitizeAndParseJSON(raw: string): KiroCanvasNode[] {
  // Extract content between ```json ... ``` if present
  const codeBlockMatch = raw.match(/```json\s*([\s\S]*?)(?:```|$)/i);
  let cleanStr = codeBlockMatch ? codeBlockMatch[1].trim() : raw.trim();

  // Find the start of the JSON array
  const startIdx = cleanStr.indexOf('[');
  if (startIdx === -1) return [];
  cleanStr = cleanStr.substring(startIdx);

  // Balance brackets to recover partial JSON from killed streams
  let brackets = 0;
  let braces = 0;
  let endIdx = cleanStr.length;

  for (let i = 0; i < cleanStr.length; i++) {
    if (cleanStr[i] === '[') brackets++;
    if (cleanStr[i] === ']') brackets--;
    if (cleanStr[i] === '{') braces++;
    if (cleanStr[i] === '}') braces--;

    if (brackets === 0 && braces === 0 && i > 0) {
      endIdx = i + 1;
      break;
    }
  }

  cleanStr = cleanStr.substring(0, endIdx);
  if (braces > 0) cleanStr += '}'.repeat(braces);
  if (brackets > 0) cleanStr += ']'.repeat(brackets);

  try {
    const parsed = JSON.parse(cleanStr);
    if (!Array.isArray(parsed)) return [];
    return parsed as KiroCanvasNode[];
  } catch {
    console.warn('[omni-client] JSON parse failed after sanitization.');
    return [];
  }
}

// ─── Dagre Auto-Layout Engine ─────────────────────────────────────────────────

export interface FlowNode {
  id: string;
  type: string;
  data: KiroCanvasNode;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style?: React.CSSProperties;
}

export function computeKiroLayout(nodes: KiroCanvasNode[]): {
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
} {
  if (nodes.length === 0) return { flowNodes: [], flowEdges: [] };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 220, height: 90 });
  });

  nodes.forEach((node) => {
    if (node.parentId) {
      g.setEdge(node.parentId, node.id);
    }
  });

  dagre.layout(g);

  const flowNodes: FlowNode[] = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      type: 'kiroNode',
      data: node,
      position: { x: (pos?.x ?? 0) - 110, y: (pos?.y ?? 0) - 45 },
    };
  });

  const flowEdges: FlowEdge[] = nodes
    .filter((n) => n.parentId !== null)
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      source: node.parentId!,
      target: node.id,
      animated: node.status === 'PENDING',
    }));

  return { flowNodes, flowEdges };
}
