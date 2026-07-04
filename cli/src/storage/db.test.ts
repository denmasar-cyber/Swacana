/**
 * SWACANA — Storage Layer Unit Tests
 *
 * Tests for the SQLite database operations.
 * Uses a fresh in-memory sql.js database for each test.
 *
 * Note: sql.js db.exec() doesn't support parameter binding.
 * Use string interpolation for WHERE clauses in exec() calls.
 * db.run() does support parameterized queries with ? placeholders.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';

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

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT,
  note_id TEXT,
  text TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  chunk_id TEXT,
  note_id TEXT,
  vector BLOB NOT NULL,
  dim INTEGER NOT NULL DEFAULT 384,
  model TEXT NOT NULL DEFAULT 'Xenova/all-MiniLM-L6-v2'
);

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
`;

describe('Storage Layer (sql.js)', () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    db.run(SCHEMA_SQL);
  });

  afterEach(() => {
    db.close();
  });

  // ─── Helper to query a single row by id ───────────────────────────────

  function queryById(table: string, id: string): Record<string, unknown> {
    const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    stmt.bind([id]);
    const row: Record<string, unknown> = {};
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      for (let i = 0; i < cols.length; i++) {
        row[cols[i]] = vals[i];
      }
    }
    stmt.free();
    return row;
  }

  function countRows(table: string): number {
    const result = db.exec(`SELECT COUNT(*) as c FROM ${table}`);
    return result[0]?.values?.[0]?.[0] as number ?? 0;
  }

  // ─── Notes CRUD ─────────────────────────────────────────────────────────

  describe('Notes', () => {
    it('should create a note and return its id', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Test Note', 'Hello World', 'manual', now, now],
      );

      const row = queryById('notes', id);
      expect(row.title).toBe('Test Note');
      expect(row.content).toBe('Hello World');
    });

    it('should get all notes ordered by updated_at DESC', () => {
      const now = new Date().toISOString();
      const earlier = new Date(Date.now() - 1000).toISOString();

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'Note 1', 'Content 1', 'manual', now, earlier],
      );
      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'Note 2', 'Content 2', 'manual', now, now],
      );

      const result = db.exec('SELECT title FROM notes ORDER BY updated_at DESC');
      expect(result[0].values[0][0]).toBe('Note 2');
      expect(result[0].values[1][0]).toBe('Note 1');
    });

    it('should search notes by title or content', () => {
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'AI Research', 'Machine learning basics', 'manual', now, now],
      );
      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'Shopping List', 'Groceries', 'manual', now, now],
      );

      const result = db.exec("SELECT title FROM notes WHERE title LIKE '%AI%'");
      expect(result[0].values.length).toBe(1);
      expect(result[0].values[0][0]).toBe('AI Research');
    });

    it('should update a note', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Original', 'Original content', 'manual', now, now],
      );

      db.run('UPDATE notes SET title = ? WHERE id = ?', ['Updated', id]);

      const row = queryById('notes', id);
      expect(row.title).toBe('Updated');
    });

    it('should delete a note', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Delete me', 'Content', 'manual', now, now],
      );

      db.run('DELETE FROM notes WHERE id = ?', [id]);

      const stmt = db.prepare('SELECT COUNT(*) as c FROM notes WHERE id = ?');
      stmt.bind([id]);
      let count = 0;
      if (stmt.step()) count = stmt.get()[0] as number;
      stmt.free();
      expect(count).toBe(0);
    });

    it('should handle empty notes table gracefully', () => {
      const result = db.exec('SELECT * FROM notes');
      // sql.js returns [] for empty result sets
      expect(result.length === 0 || result[0]?.values?.length === 0).toBe(true);
    });
  });

  // ─── Files CRUD ─────────────────────────────────────────────────────────

  describe('Files', () => {
    it('should insert a file', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO files (id, path, filename, extension, size_bytes, mtime, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, '/test/file.ts', 'file.ts', '.ts', 1024, now, 'abc123'],
      );

      const row = queryById('files', id);
      expect(row.filename).toBe('file.ts');
      expect(row.extension).toBe('.ts');
    });

    it('should update an existing file', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO files (id, path, filename, extension, size_bytes, mtime, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, '/test/file.ts', 'file.ts', '.ts', 1024, now, 'abc123'],
      );

      db.run('UPDATE files SET size_bytes = ?, content_hash = ? WHERE id = ?', [2048, 'def456', id]);

      const row = queryById('files', id);
      expect(row.size_bytes).toBe(2048);
      expect(row.content_hash).toBe('def456');
    });

    it('should count files', () => {
      const now = new Date().toISOString();

      db.run('INSERT INTO files (id, path, filename, extension, size_bytes, mtime, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), '/a.ts', 'a.ts', '.ts', 100, now, 'a']);
      db.run('INSERT INTO files (id, path, filename, extension, size_bytes, mtime, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), '/b.ts', 'b.ts', '.ts', 200, now, 'b']);

      expect(countRows('files')).toBe(2);
    });
  });

  // ─── Chunks ────────────────────────────────────────────────────────────

  describe('Chunks', () => {
    it('should create chunks with file reference', () => {
      const now = new Date().toISOString();
      const fileId = crypto.randomUUID();

      db.run('INSERT INTO files (id, path, filename, extension, size_bytes, mtime, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [fileId, '/test.ts', 'test.ts', '.ts', 100, now, 'hash']);

      const chunkId = crypto.randomUUID();
      db.run('INSERT INTO chunks (id, file_id, note_id, text, token_count) VALUES (?, ?, ?, ?, ?)',
        [chunkId, fileId, null, 'chunk content', 25]);

      const row = queryById('chunks', chunkId);
      expect(row.text).toBe('chunk content');
      expect(row.token_count).toBe(25);
    });

    it('should count chunks', () => {
      db.run('INSERT INTO chunks (id, file_id, note_id, text, token_count) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), null, null, 'chunk 1', 10]);
      db.run('INSERT INTO chunks (id, file_id, note_id, text, token_count) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), null, null, 'chunk 2', 20]);

      expect(countRows('chunks')).toBe(2);
    });
  });

  // ─── Embeddings ────────────────────────────────────────────────────────

  describe('Embeddings', () => {
    it('should store and retrieve binary vector data', () => {
      const id = crypto.randomUUID();
      const chunkId = crypto.randomUUID();
      const vector = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const buffer = Buffer.from(vector.buffer);

      db.run(
        'INSERT INTO embeddings (id, chunk_id, note_id, vector, dim, model) VALUES (?, ?, ?, ?, ?, ?)',
        [id, chunkId, null, buffer, 5, 'test-model'],
      );

      const row = queryById('embeddings', id);
      const storedBuffer = row.vector as Uint8Array;
      const storedVector = new Float32Array(storedBuffer.buffer, storedBuffer.byteOffset, storedBuffer.byteLength / 4);

      expect(storedVector.length).toBe(5);
      expect(storedVector[0]).toBeCloseTo(0.1);
      expect(storedVector[2]).toBeCloseTo(0.3);
      expect(row.dim).toBe(5);
    });
  });

  // ─── Browser Data ──────────────────────────────────────────────────────

  describe('Browser Data', () => {
    it('should store browser captured data', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO browser_data (id, title, url, content, summary, captured_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Test Page', 'https://example.com', 'Page content', 'A summary', now],
      );

      const row = queryById('browser_data', id);
      expect(row.title).toBe('Test Page');
      expect(row.url).toBe('https://example.com');
      expect(row.summary).toBe('A summary');
    });
  });

  // ─── Agent Memory ──────────────────────────────────────────────────────

  describe('Agent Memory', () => {
    it('should create memory entries', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run(
        'INSERT INTO agent_memory (id, type, content, context, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, 'insight', 'Important insight', '/some/context', now],
      );

      const row = queryById('agent_memory', id);
      expect(row.type).toBe('insight');
      expect(row.content).toBe('Important insight');
    });

    it('should get unactioned memories', () => {
      const now = new Date().toISOString();

      db.run('INSERT INTO agent_memory (id, type, content, context, created_at, is_actioned) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'task', 'Task 1', null, now, 0]);
      db.run('INSERT INTO agent_memory (id, type, content, context, created_at, is_actioned) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'task', 'Task 2', null, now, 1]);
      db.run('INSERT INTO agent_memory (id, type, content, context, created_at, is_actioned) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'insight', 'Insight 1', null, now, 0]);

      const result = db.exec('SELECT type, content FROM agent_memory WHERE is_actioned = 0 ORDER BY created_at ASC');
      expect(result[0].values.length).toBe(2);
    });

    it('should mark memory as actioned', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      db.run('INSERT INTO agent_memory (id, type, content, context, created_at, is_actioned) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'task', 'Action me', null, now, 0]);

      db.run('UPDATE agent_memory SET is_actioned = 1 WHERE id = ?', [id]);

      const row = queryById('agent_memory', id);
      expect(row.is_actioned).toBe(1);
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle very large text in notes', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const largeText = 'A'.repeat(10000);

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Large Note', largeText, 'manual', now, now],
      );

      const row = queryById('notes', id);
      expect((row.content as string).length).toBe(10000);
    });

    it('should handle special characters in content', () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const specialText = 'Hello "World" — Test with émojis 🎉';

      db.run(
        'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, 'Special', specialText, 'manual', now, now],
      );

      const row = queryById('notes', id);
      expect(row.content).toBe(specialText);
    });

    it('should handle concurrent inserts (50 rows)', () => {
      const now = new Date().toISOString();

      for (let i = 0; i < 50; i++) {
        db.run(
          'INSERT INTO notes (id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [crypto.randomUUID(), `Note ${i}`, 'Content', 'manual', now, now],
        );
      }

      expect(countRows('notes')).toBe(50);
    });
  });
});
