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

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';

// ─── Database Path ─────────────────────────────────────────────────────────

const SWACANA_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '~',
  '.swacana',
);

const DATA_DIR = path.join(SWACANA_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'swacana.db');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Singleton DB Instance ─────────────────────────────────────────────────

let _db: SqlJsDatabase | null = null;
let _initPromise: Promise<SqlJsDatabase> | null = null;

/**
 * Get or initialize the SQLite database.
 * sql.js loads WASM asynchronously on first call.
 * Always await this at the start of any command.
 */
export async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    ensureDir(DATA_DIR);
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      _db = new SQL.Database(buffer);
    } else {
      _db = new SQL.Database();
    }

    _db.run('PRAGMA journal_mode = MEMORY');
    _db.run(SCHEMA_SQL);
    saveDb();
    return _db;
  })();

  return _initPromise;
}

/**
 * Save the in-memory database to disk.
 */
export function saveDb(): void {
  if (!_db) return;
  ensureDir(DATA_DIR);
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function closeDb(): Promise<void> {
  if (_db) {
    saveDb();
    _db.close();
    _db = null;
  }
  _initPromise = null;
}

// ─── Schema ────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_path TEXT,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  extension TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  mtime TEXT,
  content_hash TEXT,
  summary TEXT,
  indexed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT,
  note_id TEXT,
  text TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_note_id ON chunks(note_id);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  chunk_id TEXT,
  note_id TEXT,
  vector BLOB NOT NULL,
  dim INTEGER NOT NULL DEFAULT 384,
  model TEXT NOT NULL DEFAULT 'Xenova/all-MiniLM-L6-v2'
);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_note_id ON embeddings(note_id);

CREATE TABLE IF NOT EXISTS browser_data (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  captured_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'insight',
  content TEXT NOT NULL,
  context TEXT,
  created_at TEXT NOT NULL,
  is_actioned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_memory_type ON agent_memory(type);
CREATE INDEX IF NOT EXISTS idx_memory_actioned ON agent_memory(is_actioned);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ─── Internal helpers ──────────────────────────────────────────────────────

function assertDb(): SqlJsDatabase {
  if (!_db) throw new Error('Database not initialized. Jalankan perintah terlebih dahulu, misalnya: swacana init');
  return _db;
}

function queryAll(sql: string, params?: Record<string, unknown>): Record<string, unknown>[] {
  const db = assertDb();
  try {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (err) {
    console.error('[DB] Query error:', sql, err);
    return [];
  }
}

function queryFirst(sql: string, params?: Record<string, unknown>): Record<string, unknown> | undefined {
  const rows = queryAll(sql, params);
  return rows[0];
}

function execute(sql: string, params?: Record<string, unknown>): void {
  const db = assertDb();
  try {
    if (params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }
    saveDb();
  } catch (err) {
    console.error('[DB] Execute error:', sql, err);
    throw err;
  }
}

function executeMany(sql: string, paramsList: Record<string, unknown>[]): void {
  const db = assertDb();
  try {
    const stmt = db.prepare(sql);
    for (const params of paramsList) {
      stmt.bind(params);
      stmt.step();
      stmt.reset();
    }
    stmt.free();
    saveDb();
  } catch (err) {
    console.error('[DB] ExecuteMany error:', err);
    throw err;
  }
}

// ─── Interface Types ───────────────────────────────────────────────────────

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

// ─── UUID & Timestamp helpers ──────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function ts(): string {
  return new Date().toISOString();
}

// ─── CRUD Operations ───────────────────────────────────────────────────────

export const notes = {
  create(title: string, content: string, sourceType = 'manual', sourcePath?: string): string {
    const id = uid();
    const t = ts();
    execute(
      'INSERT INTO notes (id, title, content, source_type, source_path, created_at, updated_at) VALUES ($id, $title, $content, $st, $sp, $ca, $ua)',
      { $id: id, $title: title, $content: content, $st: sourceType, $sp: sourcePath || null, $ca: t, $ua: t },
    );
    return id;
  },

  getAll(): Note[] {
    return queryAll('SELECT * FROM notes ORDER BY updated_at DESC') as unknown as Note[];
  },

  getById(id: string): Note | undefined {
    return queryFirst('SELECT * FROM notes WHERE id = $id', { $id: id }) as unknown as Note | undefined;
  },

  search(query: string): Note[] {
    const q = `%${query}%`;
    return queryAll('SELECT * FROM notes WHERE title LIKE $q OR content LIKE $q ORDER BY updated_at DESC', { $q: q }) as unknown as Note[];
  },

  update(id: string, data: Partial<Pick<Note, 'title' | 'content' | 'tags'>>): void {
    const t = ts();
    if (data.title !== undefined) execute('UPDATE notes SET title = $v, updated_at = $t WHERE id = $id', { $v: data.title, $t: t, $id: id });
    if (data.content !== undefined) execute('UPDATE notes SET content = $v, updated_at = $t WHERE id = $id', { $v: data.content, $t: t, $id: id });
    if (data.tags !== undefined) execute('UPDATE notes SET tags = $v, updated_at = $t WHERE id = $id', { $v: data.tags, $t: t, $id: id });
  },

  delete(id: string): void {
    execute('DELETE FROM embeddings WHERE note_id = $id', { $id: id });
    execute('DELETE FROM chunks WHERE note_id = $id', { $id: id });
    execute('DELETE FROM notes WHERE id = $id', { $id: id });
  },
};

export const files = {
  upsert(filePath: string, filename: string, ext: string, size: number, mtime: string, hash: string): string | null {
    const existing = queryFirst('SELECT id FROM files WHERE path = $p', { $p: filePath }) as { id: string } | undefined;
    if (existing) {
      execute('UPDATE files SET size_bytes=$sz, mtime=$mt, content_hash=$ch, filename=$fn, extension=$ex WHERE id=$id',
        { $sz: size, $mt: mtime, $ch: hash, $fn: filename, $ex: ext, $id: existing.id });
      return existing.id;
    }
    const id = uid();
    execute('INSERT INTO files (id, path, filename, extension, size_bytes, mtime, content_hash) VALUES ($id,$p,$fn,$ex,$sz,$mt,$ch)',
      { $id: id, $p: filePath, $fn: filename, $ex: ext, $sz: size, $mt: mtime, $ch: hash });
    return id;
  },

  getAll(): FileEntry[] {
    return queryAll('SELECT * FROM files ORDER BY indexed_at DESC') as unknown as FileEntry[];
  },

  getById(id: string): FileEntry | undefined {
    return queryFirst('SELECT * FROM files WHERE id = $id', { $id: id }) as unknown as FileEntry | undefined;
  },

  getUnindexed(): FileEntry[] {
    return queryAll('SELECT * FROM files WHERE indexed_at IS NULL') as unknown as FileEntry[];
  },

  markIndexed(id: string, summary?: string): void {
    const t = ts();
    if (summary) {
      execute('UPDATE files SET indexed_at = $t, summary = $s WHERE id = $id', { $t: t, $s: summary, $id: id });
    } else {
      execute('UPDATE files SET indexed_at = $t WHERE id = $id', { $t: t, $id: id });
    }
  },

  delete(id: string): void {
    const chunkRows = queryAll('SELECT id FROM chunks WHERE file_id = $id', { $id: id }) as { id: string }[];
    for (const c of chunkRows) execute('DELETE FROM embeddings WHERE chunk_id = $cid', { $cid: c.id });
    execute('DELETE FROM chunks WHERE file_id = $id', { $id: id });
    execute('DELETE FROM files WHERE id = $id', { $id: id });
  },

  count(): number {
    const row = queryFirst('SELECT COUNT(*) as c FROM files');
    return (row as { c: number })?.c ?? 0;
  },
};

export const chunks = {
  create(fileId: string | null, noteId: string | null, text: string, tokenCount: number): string {
    const id = uid();
    execute('INSERT INTO chunks (id, file_id, note_id, text, token_count) VALUES ($id,$fid,$nid,$t,$tc)',
      { $id: id, $fid: fileId, $nid: noteId, $t: text, $tc: tokenCount });
    return id;
  },

  bulkCreate(entries: { fileId: string | null; noteId: string | null; text: string; tokenCount: number }[]): string[] {
    const ids: string[] = [];
    const paramsList = entries.map((e) => {
      const id = uid();
      ids.push(id);
      return { $id: id, $fid: e.fileId, $nid: e.noteId, $t: e.text, $tc: e.tokenCount };
    });
    executeMany('INSERT INTO chunks (id, file_id, note_id, text, token_count) VALUES ($id,$fid,$nid,$t,$tc)', paramsList);
    return ids;
  },

  count(): number {
    const row = queryFirst('SELECT COUNT(*) as c FROM chunks');
    return (row as { c: number })?.c ?? 0;
  },
};

export const memories = {
  create(type: string, content: string, context?: string): string {
    const id = uid();
    const t = ts();
    execute('INSERT INTO agent_memory (id, type, content, context, created_at) VALUES ($id,$ty,$co,$ctx,$t)',
      { $id: id, $ty: type, $co: content, $ctx: context || null, $t: t });
    return id;
  },

  getAll(type?: string): AgentMemory[] {
    if (type) return queryAll('SELECT * FROM agent_memory WHERE type = $type ORDER BY created_at DESC', { $type: type }) as unknown as AgentMemory[];
    return queryAll('SELECT * FROM agent_memory ORDER BY created_at DESC') as unknown as AgentMemory[];
  },

  getUnactioned(): AgentMemory[] {
    return queryAll('SELECT * FROM agent_memory WHERE is_actioned = 0 ORDER BY created_at ASC') as unknown as AgentMemory[];
  },

  markActioned(id: string): void {
    execute('UPDATE agent_memory SET is_actioned = 1 WHERE id = $id', { $id: id });
  },

  count(): number {
    const row = queryFirst('SELECT COUNT(*) as c FROM agent_memory');
    return (row as { c: number })?.c ?? 0;
  },
};

export const browserData = {
  create(title: string, url: string, content: string, summary?: string): string {
    const id = uid();
    const t = ts();
    execute('INSERT INTO browser_data (id, title, url, content, summary, captured_at) VALUES ($id,$ti,$u,$co,$s,$t)',
      { $id: id, $ti: title, $u: url, $co: content, $s: summary || null, $t: t });
    return id;
  },

  getAll(): BrowserData[] {
    return queryAll('SELECT * FROM browser_data ORDER BY captured_at DESC') as unknown as BrowserData[];
  },

  count(): number {
    const row = queryFirst('SELECT COUNT(*) as c FROM browser_data');
    return (row as { c: number })?.c ?? 0;
  },
};

// ─── Database Stats ─────────────────────────────────────────────────────────

export function getStats() {
  return {
    notes: notes.getAll().length,
    files: files.count(),
    chunks: chunks.count(),
    memories: memories.count(),
    browserData: browserData.count(),
  };
}
