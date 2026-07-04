/**
 * CLI Database Reader
 *
 * Reads the SWACANA CLI's SQLite database (~/.swacana/data/swacana.db)
 * from Next.js server-side API routes.
 *
 * This provides the bridge between CLI-generated data (notes, files, chunks)
 * and the web dashboard.
 *
 * IMPORTANT: This is READ-ONLY. The CLI owns the database.
 */

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';

// ─── Database Path ─────────────────────────────────────────────────────────

function getDbPath(): string {
  const swacanaDir = path.join(
    process.env.HOME || process.env.USERPROFILE || '~',
    '.swacana',
  );
  return path.join(swacanaDir, 'data', 'swacana.db');
}

// ─── Cached DB Connection ──────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;
let _initPromise: Promise<SqlJsDatabase> | null = null;

async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      throw new Error(`CLI database not found at: ${dbPath}. Jalankan 'swacana init' atau 'swacana scan' terlebih dahulu.`);
    }
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    _db = new SQL.Database(buffer);
    return _db;
  })();

  return _initPromise;
}

function safeClose(): void {
  if (_db) {
    try { _db.close(); } catch { /* ignore */ }
    _db = null;
    _initPromise = null;
  }
}

// ─── Query Helpers ─────────────────────────────────────────────────────────

function queryAll(sql: string, params?: Record<string, unknown>): Record<string, unknown>[] {
  if (!_db) return [];
  try {
    const stmt = _db.prepare(sql);
    if (params) stmt.bind(params);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch {
    return [];
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface CliStats {
  exists: boolean;
  notes: number;
  files: number;
  chunks: number;
  memories: number;
  browserData: number;
  dbPath: string;
  error?: string;
}

export interface CliNote {
  id: string;
  title: string;
  content: string;
  source_type: string;
  source_path: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface CliFile {
  id: string;
  path: string;
  filename: string;
  extension: string;
  size_bytes: number;
  mtime: string | null;
  summary: string | null;
  indexed_at: string | null;
}

/**
 * Get database statistics from the CLI's SQLite database.
 */
export async function getCliStats(): Promise<CliStats> {
  const dbPath = getDbPath();

  if (!fs.existsSync(dbPath)) {
    return { exists: false, notes: 0, files: 0, chunks: 0, memories: 0, browserData: 0, dbPath };
  }

  try {
    await getDb();
    const stats = {
      exists: true,
      notes: (queryAll('SELECT COUNT(*) as c FROM notes')[0] as { c: number })?.c ?? 0,
      files: (queryAll('SELECT COUNT(*) as c FROM files')[0] as { c: number })?.c ?? 0,
      chunks: (queryAll('SELECT COUNT(*) as c FROM chunks')[0] as { c: number })?.c ?? 0,
      memories: (queryAll('SELECT COUNT(*) as c FROM agent_memory')[0] as { c: number })?.c ?? 0,
      browserData: (queryAll('SELECT COUNT(*) as c FROM browser_data')[0] as { c: number })?.c ?? 0,
      dbPath,
    };
    safeClose();
    return stats;
  } catch (err) {
    safeClose();
    return { exists: false, notes: 0, files: 0, chunks: 0, memories: 0, browserData: 0, dbPath, error: (err as Error).message };
  }
}

/**
 * Get all notes from the CLI's SQLite database.
 */
export async function getCliNotes(): Promise<CliNote[]> {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return [];

  try {
    await getDb();
    const rows = queryAll('SELECT * FROM notes ORDER BY updated_at DESC') as unknown as CliNote[];
    safeClose();
    return rows;
  } catch {
    safeClose();
    return [];
  }
}

/**
 * Get indexed files from the CLI's SQLite database.
 */
export async function getCliFiles(): Promise<CliFile[]> {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return [];

  try {
    await getDb();
    const rows = queryAll('SELECT * FROM files ORDER BY indexed_at DESC') as unknown as CliFile[];
    safeClose();
    return rows;
  } catch {
    safeClose();
    return [];
  }
}
