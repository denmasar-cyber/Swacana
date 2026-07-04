/**
 * SWACANA — File System Scanner
 *
 * Recursively scans directories, indexes text files,
 * generates content hashes, and prepares them for embedding.
 *
 * 100% local, no cloud calls.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isTextFile, readTextFile } from './watcher.js';
import { splitIntoChunks, estimateTokenCount } from '../ai/embedding.js';

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Default Ignore ────────────────────────────────────────────────────────

const DEFAULT_IGNORE = new Set([
  'node_modules', '.git', '.svn', '__pycache__',
  '.next', 'dist', 'build', '.cache', '.venv',
  'vendor', '.idea', '.vscode', 'coverage',
  '.DS_Store', 'Thumbs.db',
]);

// ─── File Hashing ──────────────────────────────────────────────────────────

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ─── Scan Directory ────────────────────────────────────────────────────────

async function scanDirectory(
  dirPath: string,
  options: ScannerOptions,
  results: ScanResult[],
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip ignored
      if (DEFAULT_IGNORE.has(entry.name)) continue;
      if (options.ignorePatterns?.some((p) => entry.name.includes(p) || fullPath.includes(p))) continue;

      if (entry.isDirectory() && options.recursive !== false) {
        await scanDirectory(fullPath, options, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        // Skip non-text files
        if (!isTextFile(fullPath)) continue;

        // Check file size
        const stat = await fs.stat(fullPath);
        if (options.maxFileSize && stat.size > options.maxFileSize) continue;
        if (stat.size === 0) continue;

        options.onProgress?.({
          current: results.length,
          total: 0,
          filePath: fullPath,
          status: 'reading',
        });

        const content = await readTextFile(fullPath);
        if (!content) continue;

        const hash = hashContent(content);
        const chunks = splitIntoChunks(content);

        results.push({
          fileId: crypto.randomUUID(),
          filePath: fullPath,
          filename: entry.name,
          extension: ext,
          sizeBytes: stat.size,
          contentHash: hash,
          chunkCount: chunks.length,
        });
      }
    }
  } catch (err) {
    options.onProgress?.({
      current: results.length,
      total: 0,
      filePath: dirPath,
      status: 'error',
      message: `Gagal scan: ${(err as Error).message}`,
    });
  }
}

// ─── Main Scan Function ────────────────────────────────────────────────────

export async function scanFiles(options: ScannerOptions): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const dir of options.directories) {
    try {
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) {
        // Single file
        if (isTextFile(dir)) {
          const content = await readTextFile(dir);
          if (content) {
            const ext = path.extname(dir).toLowerCase();
            results.push({
              fileId: crypto.randomUUID(),
              filePath: dir,
              filename: path.basename(dir),
              extension: ext,
              sizeBytes: stat.size,
              contentHash: hashContent(content),
              chunkCount: splitIntoChunks(content).length,
            });
          }
        }
        continue;
      }
    } catch {
      options.onProgress?.({
        current: results.length,
        total: 0,
        filePath: dir,
        status: 'error',
        message: `Path tidak ditemukan: ${dir}`,
      });
      continue;
    }

    options.onProgress?.({
      current: results.length,
      total: 0,
      filePath: dir,
      status: 'scanning',
      message: `Memindai: ${dir}`,
    });

    await scanDirectory(dir, options, results);
  }

  return results;
}

// ─── Get File Stats ────────────────────────────────────────────────────────

export async function getDirectoryStats(dirPath: string): Promise<{
  totalFiles: number;
  textFiles: number;
  totalSize: number;
}> {
  let totalFiles = 0;
  let textFiles = 0;
  let totalSize = 0;

  async function walk(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (DEFAULT_IGNORE.has(entry.name)) continue;

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          totalFiles++;
          if (isTextFile(fullPath)) {
            textFiles++;
            try {
              const stat = await fs.stat(fullPath);
              totalSize += stat.size;
            } catch { /* ignore */ }
          }
        }
      }
    } catch { /* ignore */ }
  }

  await walk(dirPath);
  return { totalFiles, textFiles, totalSize };
}
