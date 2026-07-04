/**
 * SWACANA — Vector Storage & Cosine Similarity Search
 *
 * Stores embeddings as BLOBs in SQLite and provides cosine similarity search.
 * Uses sql.js via the shared db module.
 * 100% free, no external vector DB needed.
 */
import { getDb } from './db.js';
// ─── Vector Serialization ──────────────────────────────────────────────────
function float32ArrayToBuffer(vector) {
    const arr = new Float32Array(vector);
    return Buffer.from(arr.buffer);
}
function bufferToFloat32Array(buffer) {
    const arr = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(arr);
}
// ─── Cosine Similarity ─────────────────────────────────────────────────────
export function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
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
export async function storeEmbedding(chunkId, noteId, vector, model = 'Xenova/all-MiniLM-L6-v2') {
    const db = await getDb();
    const id = crypto.randomUUID();
    const buffer = float32ArrayToBuffer(vector);
    db.run('INSERT INTO embeddings (id, chunk_id, note_id, vector, dim, model) VALUES (?, ?, ?, ?, ?, ?)', [id, chunkId, noteId, buffer, vector.length, model]);
    return id;
}
export async function storeEmbeddings(entries) {
    const db = await getDb();
    const ids = [];
    for (const e of entries) {
        const id = crypto.randomUUID();
        ids.push(id);
        db.run('INSERT INTO embeddings (id, chunk_id, note_id, vector, dim, model) VALUES (?, ?, ?, ?, ?, ?)', [id, e.chunkId, e.noteId, float32ArrayToBuffer(e.vector), e.vector.length, 'Xenova/all-MiniLM-L6-v2']);
    }
    return ids;
}
export async function searchSimilar(queryVector, topK = 5, threshold = 0.25) {
    const db = await getDb();
    const rows = db.exec(`
    SELECT e.id, e.chunk_id, e.note_id, e.vector, c.text
    FROM embeddings e
    LEFT JOIN chunks c ON c.id = e.chunk_id
  `);
    // Parse the exec result
    const parsed = [];
    if (rows.length > 0 && rows[0].values) {
        for (const row of rows[0].values) {
            parsed.push({
                chunk_id: row[1],
                note_id: row[2],
                text: row[4],
                vector: row[3],
            });
        }
    }
    const scored = [];
    for (const row of parsed) {
        if (!row.vector)
            continue;
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
export async function deleteEmbeddingsForNote(noteId) {
    const db = await getDb();
    db.run('DELETE FROM embeddings WHERE note_id = ?', [noteId]);
}
export async function deleteEmbeddingsForChunk(chunkId) {
    const db = await getDb();
    db.run('DELETE FROM embeddings WHERE chunk_id = ?', [chunkId]);
}
//# sourceMappingURL=vector.js.map