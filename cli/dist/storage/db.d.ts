/**
 * SWACANA — Local Storage Layer
 *
 * SQLite database for structured data (notes, files, chunks, memories).
 * Uses sql.js (pure JavaScript/WASM SQLite) — no native compilation needed.
 *
 * IMPORTANT: Call await getDb() at the start of any command before using
 * CRUD functions. Write operations throw if DB is not initialized.
 *
 * 100% free, no server, no API key.
 */
import { type Database as SqlJsDatabase } from 'sql.js';
/**
 * Get or initialize the SQLite database.
 * sql.js loads WASM asynchronously on first call.
 * Always await this at the start of any command.
 */
export declare function getDb(): Promise<SqlJsDatabase>;
/**
 * Save the in-memory database to disk.
 */
export declare function saveDb(): void;
export declare function closeDb(): Promise<void>;
export interface Note {
    id: string;
    title: string;
    content: string;
    source_type: string;
    source_path: string | null;
    tags: string;
    created_at: string;
    updated_at: string;
}
export interface FileEntry {
    id: string;
    path: string;
    filename: string;
    extension: string;
    size_bytes: number;
    mtime: string | null;
    content_hash: string | null;
    summary: string | null;
    indexed_at: string | null;
}
export interface AgentMemory {
    id: string;
    type: string;
    content: string;
    context: string | null;
    created_at: string;
    is_actioned: number;
}
export interface BrowserData {
    id: string;
    title: string;
    url: string;
    content: string;
    summary: string | null;
    captured_at: string;
}
export declare const notes: {
    create(title: string, content: string, sourceType?: string, sourcePath?: string): string;
    getAll(): Note[];
    getById(id: string): Note | undefined;
    search(query: string): Note[];
    update(id: string, data: Partial<Pick<Note, "title" | "content" | "tags">>): void;
    delete(id: string): void;
};
export declare const files: {
    upsert(filePath: string, filename: string, ext: string, size: number, mtime: string, hash: string): string | null;
    getAll(): FileEntry[];
    getById(id: string): FileEntry | undefined;
    getUnindexed(): FileEntry[];
    markIndexed(id: string, summary?: string): void;
    delete(id: string): void;
    count(): number;
};
export declare const chunks: {
    create(fileId: string | null, noteId: string | null, text: string, tokenCount: number): string;
    bulkCreate(entries: {
        fileId: string | null;
        noteId: string | null;
        text: string;
        tokenCount: number;
    }[]): string[];
    count(): number;
};
export declare const memories: {
    create(type: string, content: string, context?: string): string;
    getAll(type?: string): AgentMemory[];
    getUnactioned(): AgentMemory[];
    markActioned(id: string): void;
    count(): number;
};
export declare const browserData: {
    create(title: string, url: string, content: string, summary?: string): string;
    getAll(): BrowserData[];
    count(): number;
};
export declare function getStats(): {
    notes: number;
    files: number;
    chunks: number;
    memories: number;
    browserData: number;
};
//# sourceMappingURL=db.d.ts.map