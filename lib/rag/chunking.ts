/**
 * Text Chunking for RAG Pipeline
 *
 * Splits text into ~400 token chunks with 50 token overlap.
 * Token count is estimated (~4 chars per token for multilingual text).
 */

const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_TOKENS = 400;
const CHUNK_OVERLAP_TOKENS = 50;

const CHUNK_SIZE_CHARS = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
const CHUNK_OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

export interface ChunkResult {
  id: string;
  text: string;
  tokenCount: number;
  sourceRowIndex: number;
}

export function estimateTokenCount(text: string): number {
  // Simple estimation: ~4 chars per token for multilingual
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Split a single text string into overlapping chunks.
 */
export function splitIntoChunks(
  text: string,
): { text: string; tokenCount: number }[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: { text: string; tokenCount: number }[] = [];

  if (text.length <= CHUNK_SIZE_CHARS) {
    const tokenCount = estimateTokenCount(text);
    return [{ text: text.trim(), tokenCount }];
  }

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
    let chunkText = text.slice(start, end).trim();

    // If we're not at the end, try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkText.length * 0.5) {
        chunkText = chunkText.slice(0, breakPoint + 1);
      }
    }

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        tokenCount: estimateTokenCount(chunkText),
      });
    }

    // Move forward with overlap
    start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;
  }

  return chunks;
}

/**
 * Chunk rows from a dataset into chunks ready for embedding.
 * Each row's text fields are concatenated, then chunked.
 */
export function chunkRows(
  rows: Record<string, unknown>[],
  textFields: string[],
): ChunkResult[] {
  const results: ChunkResult[] = [];
  let chunkIndex = 0;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];

    // Build text from selected fields
    const fieldTexts: string[] = [];
    for (const field of textFields) {
      const value = row[field];
      if (value !== null && value !== undefined) {
        fieldTexts.push(`${field}: ${String(value)}`);
      }
    }

    const combinedText = fieldTexts.join('\n---\n');
    if (!combinedText.trim()) continue;

    const chunks = splitIntoChunks(combinedText);

    for (const chunk of chunks) {
      results.push({
        id: `chunk-${chunkIndex++}-${rowIdx}`,
        text: chunk.text,
        tokenCount: chunk.tokenCount,
        sourceRowIndex: rowIdx,
      });
    }
  }

  return results;
}

/**
 * Auto-detect text fields from the first row of a dataset.
 * Heuristic: skip fields that are purely numeric, IDs, or very short.
 */
export function autoDetectTextFields(
  firstRow: Record<string, unknown>,
): string[] {
  const skipPatterns = /^(id|_id|index|idx|row|number|count|timestamp|date|url|link|image|file|path)$/i;

  return Object.entries(firstRow)
    .filter(([key, value]) => {
      // Skip ID-like fields
      if (skipPatterns.test(key)) return false;

      // Skip null/undefined
      if (value === null || value === undefined) return false;

      const strValue = String(value);

      // Skip purely numeric values
      if (/^\d+$/.test(strValue.trim()) && strValue.trim().length < 10) return false;

      // Skip very short values (< 20 chars) — likely codes/IDs
      if (strValue.trim().length < 20) return false;

      return true;
    })
    .map(([key]) => key);
}
