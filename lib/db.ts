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
}

export interface Reminder {
  id: string;
  nodeId: string;
  noteId: string;
  title: string;
  targetDate: string;
  isAcknowledged: boolean;
}

class SelfPlanDB extends Dexie {
  notes!: Table<Note>;
  nodes!: Table<KiroCanvasNode>;
  reminders!: Table<Reminder>;

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
    // v3: add content to notes, add reminders table
    this.version(3).stores({
      notes: 'id, createdAt, updatedAt',
      nodes: 'id, noteId, parentId, nodeType, status',
      reminders: 'id, noteId, nodeId, targetDate, isAcknowledged',
    });
  }
}

export const db = new SelfPlanDB();
