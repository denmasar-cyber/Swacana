/**
 * SWACANA — File System Watcher
 *
 * Watches directories for file changes using chokidar.
 * Cross-platform (Windows, macOS, Linux).
 *
 * Features:
 * - Recursive directory watching
 * - Ignores node_modules, .git, hidden files
 * - Debounce for rapid changes
 * - Reports new, modified, and deleted files
 */
export type FileChangeType = 'add' | 'change' | 'unlink';
export interface FileChangeEvent {
    type: FileChangeType;
    filePath: string;
    filename: string;
    extension: string;
}
export interface WatcherOptions {
    /** Directories to watch */
    directories: string[];
    /** File extensions to include (default: all text files) */
    extensions?: string[];
    /** Patterns to ignore */
    ignorePatterns?: string[];
    /** Debounce time in ms (default: 500) */
    debounce?: number;
    /** Callback for file changes */
    onChange?: (event: FileChangeEvent) => void;
    /** Callback for errors */
    onError?: (err: Error) => void;
    /** Callback when watcher is ready */
    onReady?: () => void;
}
export declare class FileWatcher {
    private watcher;
    private options;
    private debounceTimers;
    constructor(options: WatcherOptions);
    /**
     * Start watching directories.
     */
    start(): void;
    /**
     * Stop watching.
     */
    stop(): Promise<void>;
    /**
     * Add more directories to watch.
     */
    addDirectory(dir: string): void;
    /**
     * Remove directory from watch.
     */
    removeDirectory(dir: string): void;
    /**
     * Get list of currently watched paths.
     */
    getWatched(): string[];
    private handleChange;
}
export declare function isTextFile(filePath: string): boolean;
export declare function readTextFile(filePath: string): Promise<string | null>;
//# sourceMappingURL=watcher.d.ts.map