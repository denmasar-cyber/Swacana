/**
 * RAG Retrieval Pipeline
 *
 * Core retrieval logic: given a user query and noteId,
 * embedding the query, find the top-K most similar chunks
 * via cosine similarity, and return augmented context + citations.
 */

import { db, type Citation } from '@/lib/db';
import { embedText } from '@/lib/embedding-engine';

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

// ─── Retrieval Result ──────────────────────────────────────────────────────

export interface RetrievalResult {
  context: string;
  citations: Citation[];
  usedRag: boolean;
}

// ─── Main Retrieval Function ───────────────────────────────────────────────

export async function retrieveContext(
  noteId: string,
  query: string,
  topK = 5,
): Promise<RetrievalResult> {
  // 1. Check if this note has active, ready datasets
  const enabledDatasets = await db.datasets
    .where({ noteId })
    .and((d) => d.isEnabled && d.status === 'READY')
    .toArray();

  if (enabledDatasets.length === 0) {
    return { context: '', citations: [], usedRag: false };
  }

  // 2. Embed the query
  let queryVector: number[];
  try {
    queryVector = await embedText(query);
  } catch (err) {
    console.warn('[RAG] Embedding failed, proceeding without RAG:', err);
    return { context: '', citations: [], usedRag: false };
  }

  // 3. Get all embeddings for this note
  const allEmbeddings = await db.embeddings.where({ noteId }).toArray();

  if (allEmbeddings.length === 0) {
    return { context: '', citations: [], usedRag: false };
  }

  // 4. Compute cosine similarity and get top-K
  const scored = allEmbeddings
    .map((e) => ({
      ...e,
      score: cosineSimilarity(queryVector, e.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((e) => e.score > 0.35); // Relevance threshold

  if (scored.length === 0) {
    return { context: '', citations: [], usedRag: false };
  }

  // 5. Get the actual chunk texts
  const chunkIds = scored.map((s) => s.chunkId);
  const chunkRows = await db.chunks.where('id').anyOf(chunkIds).toArray();

  // Map chunks by ID for quick lookup
  const chunkMap = new Map(chunkRows.map((c) => [c.id, c]));

  // 6. Build citations
  const citations: Citation[] = scored
    .map((s, i) => {
      const chunk = chunkMap.get(s.chunkId);
      if (!chunk) return null;
      return {
        index: i + 1,
        datasetId: chunk.datasetId,
        sourceRowIndex: chunk.sourceRowIndex,
        snippet: chunk.text.slice(0, 160),
      };
    })
    .filter((c): c is Citation => c !== null);

  // 7. Build context string
  const context = scored
    .map((s, i) => {
      const chunk = chunkMap.get(s.chunkId);
      return chunk ? `[${i + 1}] ${chunk.text}` : '';
    })
    .filter(Boolean)
    .join('\n\n');

  return { context, citations, usedRag: citations.length > 0 };
}

// ─── Build Augmented Prompt ────────────────────────────────────────────────

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
