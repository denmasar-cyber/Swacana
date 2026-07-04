/**
 * SWACANA v2 — Server-side RAG Retrieval (PostgreSQL)
 *
 * Replaces the Dexie-based retrieval with Prisma queries.
 * Runs entirely on the server — never touches the client.
 */

import prisma from './db';
import { embedText, DEFAULT_EMBEDDING_MODEL } from './ollama';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Citation {
  index: number;
  datasetId: string;
  sourceRowIndex: number;
  snippet: string;
}

export interface RetrievalResult {
  context: string;
  citations: Citation[];
  usedRag: boolean;
}

// ─── Cosine Similarity ─────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// ─── Main Retrieval ────────────────────────────────────────────────────────

/**
 * Retrieve relevant context for a query from the note's datasets.
 * Uses Ollama embeddings + cosine similarity on stored vectors.
 */
export async function retrieveContext(
  noteId: string,
  query: string,
  topK = 5,
): Promise<RetrievalResult> {
  // 1. Check if this note has active, ready datasets
  const enabledDatasets = await prisma.dataset.findMany({
    where: { noteId, isEnabled: true, status: 'READY' },
  });

  if (enabledDatasets.length === 0) {
    return { context: '', citations: [], usedRag: false };
  }

  // 2. Embed the query via Ollama
  let queryVector: number[];
  try {
    queryVector = await embedText(query, DEFAULT_EMBEDDING_MODEL);
  } catch (err) {
    console.warn('[RAG] Embedding failed, proceeding without RAG:', err);
    return { context: '', citations: [], usedRag: false };
  }

  // 3. Get all embeddings for this note
  const allEmbeddings = await prisma.embedding.findMany({
    where: { noteId },
    include: { chunk: true },
  });

  if (allEmbeddings.length === 0) {
    return { context: '', citations: [], usedRag: false };
  }

  // 4. Compute cosine similarity and get top-K
  const scored = allEmbeddings
    .map((e: typeof allEmbeddings[number]) => {
      const vec = Array.isArray(e.vector) ? (e.vector as number[]) : [];
      return {
        ...e,
        score: cosineSimilarity(queryVector, vec),
      };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, topK)
    .filter((e: { score: number }) => e.score > 0.35);

  if (scored.length === 0) {
    return { context: '', citations: [], usedRag: false };
  }

  // 5. Build citations and context
  const citations: Citation[] = scored
    .map((s: typeof scored[number], i: number) => {
      const chunk = s.chunk as { sourceRowIndex?: number; text?: string } | null;
      return {
        index: i + 1,
        datasetId: '',
        sourceRowIndex: chunk?.sourceRowIndex ?? 0,
        snippet: (chunk?.text || '').slice(0, 160),
      };
    });

  const context = scored
    .map((s: typeof scored[number], i: number) => `[${i + 1}] ${s.chunk?.text || ''}`)
    .filter(Boolean)
    .join('\n\n');

  return { context, citations, usedRag: true };
}

/**
 * Build an augmented system prompt with RAG context.
 */
export async function buildAugmentedPrompt(
  noteId: string,
  userMessage: string,
  basePrompt: string,
): Promise<{ systemPrompt: string; citations: Citation[] }> {
  const { context, citations } = await retrieveContext(noteId, userMessage);

  if (!context) {
    return { systemPrompt: basePrompt, citations: [] };
  }

  const ragSystemPrompt = `${basePrompt}

You have access to the following data snippets from datasets attached by the user.
Use them ONLY if relevant to the question. If you use information from here,
mark with [number] according to the source. If nothing is relevant, answer based on
general knowledge and DO NOT claim it comes from the dataset.

=== ATTACHED DATA ===
${context}
=== END OF DATA ===`;

  return { systemPrompt: ragSystemPrompt, citations };
}
