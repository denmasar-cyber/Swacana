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
  createdAt: string;
  updatedAt: string;
}

class SelfPlanDB extends Dexie {
  notes!: Table<Note>;
  nodes!: Table<KiroCanvasNode>;

  constructor() {
    super('SelfPlanHubDB');
    this.version(1).stores({
      notes: 'id, createdAt',
      nodes: 'id, noteId, parentId, nodeType, status',
    });
    // v2: add updatedAt index to notes for orderBy queries
    this.version(2).stores({
      notes: 'id, createdAt, updatedAt',
      nodes: 'id, noteId, parentId, nodeType, status',
    });
  }
}

export const db = new SelfPlanDB();
