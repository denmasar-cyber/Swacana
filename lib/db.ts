import Dexie, { type Table } from 'dexie';

export interface KiroCanvasNode {
  id: string;
  noteId: string;
  parentId: string | null;
  nodeType: 'ROOT_CAUSE' | 'DIAGNOSIS' | 'IMPACT' | 'MITIGATION';
  label: string;
  details: string;
  targetDate: string | null;
  status: 'PENDING' | 'DONE';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  chatMode: 'default' | 'analitis' | 'ringkas' | 'custom';
  chatModeCustomPrompt: string | null;
}

export interface Reminder {
  id: string;
  nodeId: string;
  noteId: string;
  title: string;
  targetDate: string;
  isAcknowledged: boolean;
}

// ─── RAG Tables ──────────────────────────────────────────────────────────

export interface Dataset {
  id: string;
  noteId: string;
  hfDatasetId: string;
  hfConfig: string | null;
  hfSplit: string;
  textFields: string[];
  rowLimit: number;
  totalRowsFetched: number;
  totalChunks: number;
  status: 'FETCHING' | 'CHUNKING' | 'EMBEDDING' | 'READY' | 'ERROR';
  errorMessage: string | null;
  isEnabled: boolean;
  createdAt: string;
}

export interface Chunk {
  id: string;
  datasetId: string;
  noteId: string;
  sourceRowIndex: number;
  text: string;
  tokenCount: number;
}

export interface Embedding {
  id: string;
  chunkId: string;
  noteId: string;
  vector: number[];
  dim: number;
  model: string;
}

// ─── Chat Message ────────────────────────────────────────────────────────

export interface Citation {
  index: number;
  datasetId: string;
  sourceRowIndex: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  noteId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

class SelfPlanDB extends Dexie {
  notes!: Table<Note>;
  nodes!: Table<KiroCanvasNode>;
  reminders!: Table<Reminder>;
  datasets!: Table<Dataset>;
  chunks!: Table<Chunk>;
  embeddings!: Table<Embedding>;
  chatMessages!: Table<ChatMessage>;

  constructor() {
    super('SelfPlanHubDB');

    // Version 1-3: Original schema
    this.version(1).stores({
      notes: 'id, createdAt',
      nodes: 'id, noteId, parentId, nodeType, status',
    });
    this.version(2).stores({
      notes: 'id, createdAt, updatedAt',
      nodes: 'id, noteId, parentId, nodeType, status',
    });
    this.version(3).stores({
      notes: 'id, createdAt, updatedAt',
      nodes: 'id, noteId, parentId, nodeType, status',
      reminders: 'id, noteId, nodeId, targetDate, isAcknowledged',
    });

    // v4: Add chatMode + chatModeCustomPrompt to notes, add RAG tables
    this.version(4).stores({
      notes: 'id, createdAt, updatedAt',
      nodes: 'id, noteId, parentId, nodeType, status',
      reminders: 'id, noteId, nodeId, targetDate, isAcknowledged',
      datasets: 'id, noteId, status, isEnabled',
      chunks: 'id, datasetId, noteId',
      embeddings: 'id, chunkId, noteId',
      chatMessages: 'id, noteId, role, createdAt',
    });

    // v5: Add chatMessages table (already added in v4)
  }
}

export const db = new SelfPlanDB();
