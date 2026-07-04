'use client';

import { useMemo, useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Columns, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { db, type KiroCanvasNode } from '@/lib/db';
import { cn } from '@/lib/utils';

interface BoardColumn {
  id: string;
  title: string;
  icon: typeof CheckCircle;
  color: string;
  filter: (n: KiroCanvasNode) => boolean;
  dropStatus?: 'PENDING' | 'DONE';
}

const COLUMNS: BoardColumn[] = [
  {
    id: 'pending',
    title: 'Pending',
    icon: Clock,
    color: '#f59e0b',
    filter: (n) => n.status === 'PENDING',
    dropStatus: 'PENDING',
  },
  {
    id: 'done',
    title: 'Done',
    icon: CheckCircle,
    color: '#22c55e',
    filter: (n) => n.status === 'DONE',
    dropStatus: 'DONE',
  },
];

export default function BoardView() {
  const router = useRouter();
  const allNodes = useLiveQuery(() => db.nodes.toArray(), [], []) as KiroCanvasNode[];
  const notes = useLiveQuery(() => db.notes.toArray(), [], []) as Array<{ id: string; title: string }>;

  // Filter to MITIGATION nodes only
  const mitigations = useMemo(
    () => (allNodes as KiroCanvasNode[]).filter((n) => n.nodeType === 'MITIGATION'),
    [allNodes],
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('text/plain', nodeId);
    setDragId(nodeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOver(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, column: BoardColumn) => {
      e.preventDefault();
      setDragOver(null);
      setDragId(null);

      const nodeId = e.dataTransfer.getData('text/plain');
      if (!nodeId || !column.dropStatus) return;

      const node = await db.nodes.get(nodeId);
      if (!node || node.status === column.dropStatus) return;

      await db.nodes.update(nodeId, { status: column.dropStatus });
    },
    [],
  );

  const today = new Date().toISOString().split('T')[0];

  const getNoteTitle = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    return note?.title || 'Unknown';
  };

  if (mitigations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted px-8">
        <Columns size={36} className="mb-3 opacity-20" />
        <p className="text-xs text-center">No mitigation tasks yet.</p>
        <p className="text-[10px] text-muted text-center mt-1">Generate tasks from the Studio panel or chat with AI.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <Columns size={10} className="text-muted" />
        <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Board</span>
        <span className="text-[9px] text-muted ml-auto">{mitigations.filter((n) => n.status === 'DONE').length}/{mitigations.length} done</span>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 p-3 overflow-x-auto">
        {COLUMNS.map((column) => {
          const items = mitigations.filter(column.filter);
          const isOver = dragOver === column.id;

          return (
            <div key={column.id}
              className={cn('flex-1 min-w-[280px] flex flex-col rounded-lg border transition-all',
                isOver ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface')}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column)}>
              <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2" style={{ borderBottomColor: `${column.color}20` }}>
                <column.icon size={12} style={{ color: column.color }} />
                <span className="text-xs font-semibold" style={{ color: column.color }}>{column.title}</span>
                <span className="text-[9px] text-muted ml-auto">{items.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-[9px] text-muted border-2 border-dashed border-border rounded-lg">Drop tasks here</div>
                ) : (
                  items.map((node) => {
                    const isOverdue = node.status === 'PENDING' && node.targetDate && node.targetDate < today;
                    return (
                      <div key={node.id} draggable
                        onDragStart={(e) => handleDragStart(e, node.id)}
                        onClick={() => router.push(`/note/${node.noteId}`)}
                        className={cn('board-card cursor-grab', dragId === node.id && 'opacity-50', isOverdue && 'border-danger/30')}>
                        <p className="text-[11px] font-medium text-foreground truncate leading-snug">{node.label}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {node.targetDate && (
                            <span className={cn('text-[9px] font-mono flex items-center gap-0.5', isOverdue ? 'text-danger' : 'text-muted')}>
                              {isOverdue && <AlertCircle size={8} />}{node.targetDate}
                            </span>
                          )}
                          <span className="text-[8px] text-muted truncate ml-auto">{getNoteTitle(node.noteId)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
