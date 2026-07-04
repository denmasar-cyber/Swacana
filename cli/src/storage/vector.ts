/**
 * SWACANA — Vector Storage & Cosine Similarity Search
 *
 * Stores embeddings as BLOBs in SQLite and provides cosine similarity search.
 * Uses sql.js via the shared db module.
 * 100% free, no external vector DB needed.
 */

import { getDb } from './db.js';
import type { Database as SqlJsDatabase } from 'sql.js';

// ─── Vector Serialization ──────────────────────────────────────────────────

function float32ArrayToBuffer(vector: number[]): Buffer {
  const arr = new Float32Array(vector);
  return Buffer.from(arr.buffer);
}

function bufferToFloat32Array(buffer: Buffer): number[] {
  const arr = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  return Array.from(arr);
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

// ─── CRUD ──────────────────────────────────────────────────────────────────

export async function storeEmbedding(
  chunkId: string,
  noteId: string | null,
  vector: number[],
  model = 'Xenova/all-MiniLM-L6-v2',
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const buffer = float32ArrayToBuffer(vector);

  db.run(
    'INSERT INTO embeddings (id, chunk_id, note_id, vector, dim, model) VALUES (?, ?, ?, ?, ?, ?)',
    [id, chunkId, noteId, buffer, vector.length, model],
  );

  return id;
}

export async function storeEmbeddings(
  entries: { chunkId: string; noteId: string | null; vector: number[] }[],
): Promise<string[]> {
  const db = await getDb();
  const ids: string[] = [];

  for (const e of entries) {
    const id = crypto.randomUUID();
    ids.push(id);
    db.run(
      'INSERT INTO embeddings (id, chunk_id, note_id, vector, dim, model) VALUES (?, ?, ?, ?, ?, ?)',
      [id, e.chunkId, e.noteId, float32ArrayToBuffer(e.vector), e.vector.length, 'Xenova/all-MiniLM-L6-v2'],
    );
  }

  return ids;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  chunkId: string;
  noteId: string | null;
  text: string;
  score: number;
}

export async function searchSimilar(
  queryVector: number[],
  topK = 5,
  threshold = 0.25,
): Promise<SearchResult[]> {
  const db = await getDb();

  const rows = db.exec(`
    SELECT e.id, e.chunk_id, e.note_id, e.vector, c.text
    FROM embeddings e
    LEFT JOIN chunks c ON c.id = e.chunk_id
  `);

  // Parse the exec result
  const parsed: { chunk_id: string; note_id: string | null; text: string; vector: Buffer }[] = [];
  if (rows.length > 0 && rows[0].values) {
    for (const row of rows[0].values) {
      parsed.push({
        chunk_id: row[1] as string,
        note_id: row[2] as string | null,
        text: row[4] as string,
        vector: row[3] as Buffer,
      });
    }
  }

  const scored: SearchResult[] = [];

  for (const row of parsed) {
    if (!row.vector) continue;
    const vec = bufferToFloat32Array(row.vector);
    const score = cosineSimilarity(queryVector, vec);

    if (score > threshold) {
      scored.push({
        chunkId: row.chunk_id,
        noteId: row.note_id,
        text: row.text || '',
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteEmbeddingsForNote(noteId: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM embeddings WHERE note_id = ?', [noteId]);
}

export async function deleteEmbeddingsForChunk(chunkId: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM embeddings WHERE chunk_id = ?', [chunkId]);
}
