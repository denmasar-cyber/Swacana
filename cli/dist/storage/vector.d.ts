/**
 * SWACANA — Vector Storage & Cosine Similarity Search
 *
 * Stores embeddings as BLOBs in SQLite and provides cosine similarity search.
 * Uses sql.js via the shared db module.
 * 100% free, no external vector DB needed.
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
export declare function storeEmbedding(chunkId: string, noteId: string | null, vector: number[], model?: string): Promise<string>;
export declare function storeEmbeddings(entries: {
    chunkId: string;
    noteId: string | null;
    vector: number[];
}[]): Promise<string[]>;
export interface SearchResult {
    chunkId: string;
    noteId: string | null;
    text: string;
    score: number;
}
export declare function searchSimilar(queryVector: number[], topK?: number, threshold?: number): Promise<SearchResult[]>;
export declare function deleteEmbeddingsForNote(noteId: string): Promise<void>;
export declare function deleteEmbeddingsForChunk(chunkId: string): Promise<void>;
//# sourceMappingURL=vector.d.ts.map