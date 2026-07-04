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

import chokidar from 'chokidar';
import path from 'node:path';
import { promises as fs } from 'node:fs';

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Default Ignore Patterns ───────────────────────────────────────────────

const DEFAULT_IGNORE = [
  /(^|[\/\\])\../,       // Hidden files/dirs (starting with .)
  /node_modules/,
  /\.git/,
  /\.svn/,
  /__pycache__/,
  /\.next/,
  /dist/,
  /\.cache/,
  /vendor/,
  /\.venv/,
];

const TEXT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.mdx', '.txt', '.json', '.yaml', '.yml',
  '.toml', '.xml', '.html', '.css', '.scss', '.less',
  '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h',
  '.sql', '.sh', '.ps1', '.bat', '.env', '.cfg', '.ini',
  '.csv', '.log',
];

// ─── Chokidar Watcher ──────────────────────────────────────────────────────

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private options: WatcherOptions;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(options: WatcherOptions) {
    this.options = {
      ...options,
      extensions: options.extensions || TEXT_EXTENSIONS,
      ignorePatterns: options.ignorePatterns || [],
      debounce: options.debounce || 500,
    };
  }

  /**
   * Start watching directories.
   */
  start(): void {
    if (this.watcher) return;

    const ignorePatterns = [
      ...DEFAULT_IGNORE,
      ...(this.options.ignorePatterns?.map((p) => new RegExp(p)) || []),
    ];

    this.watcher = chokidar.watch(this.options.directories, {
      ignored: (testPath: string) => {
        return ignorePatterns.some((pattern) => pattern.test(testPath));
      },
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      ignorePermissionErrors: true,
    });

    // Register handlers
    this.watcher
      .on('add', (filePath: string) => this.handleChange('add', filePath))
      .on('change', (filePath: string) => this.handleChange('change', filePath))
      .on('unlink', (filePath: string) => this.handleChange('unlink', filePath))
      .on('error', (err: Error) => {
        this.options.onError?.(err);
      })
      .on('ready', () => {
        this.options.onReady?.();
      });
  }

  /**
   * Stop watching.
   */
  async stop(): Promise<void> {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Add more directories to watch.
   */
  addDirectory(dir: string): void {
    this.watcher?.add(dir);
  }

  /**
   * Remove directory from watch.
   */
  removeDirectory(dir: string): void {
    this.watcher?.unwatch(dir);
  }

  /**
   * Get list of currently watched paths.
   */
  getWatched(): string[] {
    if (!this.watcher) return [];
    const watched = this.watcher.getWatched();
    const paths: string[] = [];
    for (const [dir, files] of Object.entries(watched)) {
      for (const file of files) {
        paths.push(path.join(dir, file));
      }
    }
    return paths;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private handleChange(type: FileChangeType, filePath: string): void {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Filter by extension if specified
    if (this.options.extensions && type !== 'unlink') {
      if (!this.options.extensions.includes(ext)) return;
    }

    const event: FileChangeEvent = { type, filePath, filename, extension: ext };

    // Debounce rapid changes
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) clearTimeout(existingTimer);

    this.debounceTimers.set(
      filePath,
      setTimeout(() => {
        this.debounceTimers.delete(filePath);
        this.options.onChange?.(event);
      }, this.options.debounce!)
    );
  }
}

// ─── Text File Detection ───────────────────────────────────────────────────

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.mdx', '.txt', '.json', '.yaml', '.yml',
  '.toml', '.xml', '.html', '.css', '.scss', '.less',
  '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h',
  '.sql', '.sh', '.ps1', '.bat', '.env', '.cfg', '.ini',
  '.csv', '.log', '.svg',
]);

export function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXT.has(ext);
}

export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
