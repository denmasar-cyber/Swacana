/**
 * SWACANA — Text Embedding Engine
 *
 * Uses Transformers.js to generate text embeddings 100% locally.
 * Model: all-MiniLM-L6-v2 (384-dim, multilingual, ~90MB)
 *
 * No API keys, no cloud calls, 100% free.
 */
export interface EmbeddingProgress {
    current: number;
    total: number;
    phase: 'loading' | 'embedding' | 'done' | 'error';
    message?: string;
}
export type EmbeddingCallback = (progress: EmbeddingProgress) => void;
export declare function initEmbeddingEngine(onProgress?: EmbeddingCallback): Promise<void>;
export declare function embedText(text: string): Promise<number[]>;
export declare function embedBatch(texts: string[], onProgress?: EmbeddingCallback): Promise<number[][]>;
export declare function isEmbeddingReady(): boolean;
export declare function getEmbeddingInfo(): {
    modelId: string;
    dim: number;
    ready: boolean;
    loading: boolean;
};
export declare function estimateTokenCount(text: string): number;
export interface ChunkResult {
    text: string;
    tokenCount: number;
}
export declare function splitIntoChunks(text: string): ChunkResult[];
//# sourceMappingURL=embedding.d.ts.map