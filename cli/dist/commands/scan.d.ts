/**
 * SWACANA — Scan Command
 *
 * Scans directories and indexes all text files for AI learning.
 * - Recursively finds all text files
 * - Generates summaries with AI
 * - Creates embeddings for RAG
 * - Extracts insights
 *
 * Usage: swacana scan <directory> [directories...]
 */
export declare function scanCommand(directories: string[], options?: {
    noEmbed?: boolean;
    maxFiles?: number;
}): Promise<void>;
//# sourceMappingURL=scan.d.ts.map