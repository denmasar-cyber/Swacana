/**
 * SWACANA — File System Scanner
 *
 * Recursively scans directories, indexes text files,
 * generates content hashes, and prepares them for embedding.
 *
 * 100% local, no cloud calls.
 */
export interface ScanProgress {
    current: number;
    total: number;
    filePath: string;
    status: 'scanning' | 'reading' | 'chunking' | 'done' | 'error';
    message?: string;
}
export interface ScanResult {
    fileId: string;
    filePath: string;
    filename: string;
    extension: string;
    sizeBytes: number;
    contentHash: string;
    chunkCount: number;
}
export interface ScannerOptions {
    /** Directories to scan */
    directories: string[];
    /** Include subdirectories (default: true) */
    recursive?: boolean;
    /** Max file size in bytes (default: 1MB) */
    maxFileSize?: number;
    /** Patterns to ignore */
    ignorePatterns?: string[];
    /** Progress callback */
    onProgress?: (progress: ScanProgress) => void;
}
export declare function scanFiles(options: ScannerOptions): Promise<ScanResult[]>;
export declare function getDirectoryStats(dirPath: string): Promise<{
    totalFiles: number;
    textFiles: number;
    totalSize: number;
}>;
//# sourceMappingURL=scanner.d.ts.map