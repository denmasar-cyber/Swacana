/**
 * SWACANA — Watch Command
 *
 * Watches directories for file changes. Automatically:
 * - Indexes new/modified files
 * - Generates AI summaries
 * - Creates notes from insights
 * - Stores embeddings for RAG
 *
 * Usage: swacana watch <directory> [directories...]
 */
export declare function watchCommand(directories: string[], options?: {
    noAgent?: boolean;
    interval?: number;
}): Promise<void>;
//# sourceMappingURL=watch.d.ts.map