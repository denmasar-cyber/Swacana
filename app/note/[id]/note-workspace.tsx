'use client';

import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, LayoutGrid, CheckSquare, Square, CalendarClock, AlertCircle } from 'lucide-react';

import { db, type KiroCanvasNode } from '@/lib/db';
import { streamLLM, sanitizeAndParseJSON } from '@/lib/omni-client';
import type { LoadProgress } from '@/lib/webllm-client';
import ChatConsole from '@/components/features/chat-console';
import KiroCanvasWorkspace from '@/components/features/kiro-canvas-workspace';
import NoteEditor from '@/components/features/note-editor';
import DataExplorer from '@/components/features/data-explorer';
import { cn } from '@/lib/utils';

interface Props {
  noteId: string;
}

type PanelView = 'editor' | 'explorer';
type BottomView = 'mindmap' | 'mitigation' | 'both';

export default function NoteWorkspace({ noteId }: Props) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [activePanel, setActivePanel] = useState<PanelView>('editor');
  const [bottomView, setBottomView] = useState<BottomView>('both');
  const [showToolbar, setShowToolbar] = useState(true);

  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const nodes = useLiveQuery(
    () => db.nodes.where('noteId').equals(noteId).toArray(),
    [noteId],
    [],
  );

  const handleStream = useCallback(
    async (
      userMessage: string,
      modelId: string,
      onChunk: (chunk: string) => void,
      signal: AbortSignal,
      onLoadProgress: (p: LoadProgress) => void,
    ) => {
      let fullBuffer = '';

      await streamLLM(
        userMessage,
        modelId,
        (chunk) => {
          fullBuffer += chunk;
          onChunk(chunk);
        },
        signal,
        onLoadProgress,
      );

      // Parse and persist nodes from the completed stream
      const parsed = sanitizeAndParseJSON(fullBuffer);
      if (parsed.length > 0) {
        const withNote = parsed.map((n) => ({ ...n, noteId }));

        // Upsert: replace existing nodes for this note
        await db.nodes.where('noteId').equals(noteId).delete();
        await db.nodes.bulkAdd(withNote);

        // Update note title from ROOT_CAUSE node if present
        const root = withNote.find((n) => n.nodeType === 'ROOT_CAUSE');
        if (root) {
          await db.notes.update(noteId, {
            title: root.label,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    },
    [noteId],
  );

  const handleToggleDone = useCallback(async (id: string) => {
    const node = await db.nodes.get(id);
    if (!node) return;
    await db.nodes.update(id, {
      status: node.status === 'DONE' ? 'PENDING' : 'DONE',
    });
  }, []);

  const saveTitle = async () => {
    await db.notes.update(noteId, {
      title: titleDraft,
      updatedAt: new Date().toISOString(),
    });
    setEditingTitle(false);
  };

  if (!note) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  const mitigationNodes = (nodes ?? []).filter((n) => n.nodeType === 'MITIGATION');

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-slate-700 shrink-0">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft size={16} />
        </button>

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            className="bg-slate-800 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-indigo-500"
          />
        ) : (
          <button
            onClick={() => {
              setTitleDraft(note.title);
              setEditingTitle(true);
            }}
            className="flex items-center gap-1.5 text-sm font-semibold hover:text-indigo-400 transition-colors group"
          >
            {note.title}
            <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Panel toggle buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setActivePanel('editor')}
            className={cn(
              'text-[10px] px-2 py-1 rounded transition-colors',
              activePanel === 'editor'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700',
            )}
          >
            Notes
          </button>
          <button
            onClick={() => setActivePanel('explorer')}
            className={cn(
              'text-[10px] px-2 py-1 rounded transition-colors',
              activePanel === 'explorer'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700',
            )}
          >
            Data Explorer
          </button>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest ml-2">
            100% Local
          </span>
        </div>
      </header>

      {/* ── Main Content Area (3 rows) ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Row 1: Note Editor / Data Explorer */}
        <div className="flex-1 min-h-0 border-b border-slate-700">
          {activePanel === 'editor' ? (
            <NoteEditor />
          ) : (
            <DataExplorer />
          )}
        </div>

        {/* Row 2: AI Chat (scrollable) */}
        <div className="h-64 shrink-0 border-b border-slate-700 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1 border-b border-slate-700/50 shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
              <LayoutGrid size={10} />
              AI Chat
            </span>
            <span className="text-[9px] text-slate-600">Powered by WebLLM · 100% Local</span>
          </div>
          <div className="flex-1 min-h-0">
            <ChatConsole onStream={handleStream} />
          </div>
        </div>

        {/* Row 3: Toolbar with Mindmap + Mitigation */}
        <div className="h-56 shrink-0 flex">
          {/* Toggle toolbar button */}
          <button
            onClick={() => setShowToolbar((v) => !v)}
            className="w-5 shrink-0 flex items-center justify-center border-r border-slate-700 hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300"
            title={showToolbar ? 'Hide toolbar' : 'Show toolbar'}
          >
            <div className="w-1 h-8 rounded-full bg-slate-600" />
          </button>

          {showToolbar && (
            <>
              {/* View toggle buttons */}
              <div className="w-20 shrink-0 flex flex-col border-r border-slate-700 p-1 gap-1">
                <button
                  onClick={() => setBottomView('mindmap')}
                  className={cn(
                    'text-[9px] px-1 py-1.5 rounded transition-colors text-center',
                    bottomView === 'mindmap' || bottomView === 'both'
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-slate-500 hover:bg-slate-800',
                  )}
                >
                  Mind Map
                </button>
                <button
                  onClick={() => setBottomView('mitigation')}
                  className={cn(
                    'text-[9px] px-1 py-1.5 rounded transition-colors text-center',
                    bottomView === 'mitigation' || bottomView === 'both'
                      ? 'bg-amber-600/20 text-amber-300'
                      : 'text-slate-500 hover:bg-slate-800',
                  )}
                >
                  Deadline
                </button>
                <button
                  onClick={() => setBottomView('both')}
                  className={cn(
                    'text-[9px] px-1 py-1.5 rounded transition-colors text-center',
                    bottomView === 'both'
                      ? 'bg-emerald-600/20 text-emerald-300'
                      : 'text-slate-500 hover:bg-slate-800',
                  )}
                >
                  Both
                </button>
              </div>

              {/* Main toolbar content */}
              <div className="flex-1 min-w-0 flex">
                {/* Mind Mapping */}
                {(bottomView === 'mindmap' || bottomView === 'both') && (
                  <div
                    className={cn(
                      'flex flex-col min-w-0',
                      bottomView === 'both' ? 'w-1/2 border-r border-slate-700' : 'flex-1',
                    )}
                  >
                    <div className="px-2 py-1 border-b border-slate-700/50 shrink-0 flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold">
                        Hierarchical Mind Mapping
                      </span>
                      <span className="text-[9px] text-slate-600 ml-auto">
                        {nodes?.length ?? 0} nodes
                      </span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <KiroCanvasWorkspace
                        nodes={nodes ?? []}
                        onToggleDone={handleToggleDone}
                      />
                    </div>
                  </div>
                )}

                {/* Mitigation Deadline */}
                {(bottomView === 'mitigation' || bottomView === 'both') && (
                  <div
                    className={cn(
                      'flex flex-col min-w-0',
                      bottomView === 'both' ? 'w-1/2' : 'flex-1',
                    )}
                  >
                    <div className="px-2 py-1 border-b border-slate-700/50 shrink-0 flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                        Mitigation Deadline
                      </span>
                      <span className="text-[9px] text-slate-600 ml-auto">
                        {mitigationNodes.length} tasks
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 p-2">
                      <MitigationListView
                        mitigations={mitigationNodes}
                        onToggleDone={handleToggleDone}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MitigationListView({
  mitigations,
  onToggleDone,
}: {
  mitigations: KiroCanvasNode[];
  onToggleDone: (id: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  if (mitigations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <CalendarClock size={24} className="mb-2 opacity-30" />
        <p className="text-xs text-center">No mitigation tasks yet.</p>
        <p className="text-[10px] text-slate-600 text-center mt-1">
          Chat with AI to generate mitigation plans.
        </p>
      </div>
    );
  }

  const sorted = [...mitigations]
    .filter((n) => n.targetDate)
    .sort((a, b) => (a.targetDate! > b.targetDate! ? 1 : -1));

  const pending = sorted.filter((n) => n.status === 'PENDING');
  const done = sorted.filter((n) => n.status === 'DONE');

  return (
    <div className="h-full overflow-y-auto space-y-1.5">
      {/* Overdue first */}
      {pending
        .filter((n) => n.targetDate! < today)
        .map((n) => (
          <MitigationItem key={n.id} node={n} isOverdue onToggle={onToggleDone} />
        ))}

      {/* Upcoming */}
      {pending
        .filter((n) => n.targetDate! >= today)
        .map((n) => (
          <MitigationItem key={n.id} node={n} onToggle={onToggleDone} />
        ))}

      {/* Done */}
      {done.map((n) => (
        <MitigationItem key={n.id} node={n} isDone onToggle={onToggleDone} />
      ))}

      {pending.length === 0 && done.length === 0 && (
        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
          All tasks are sorted by deadline.
        </div>
      )}
    </div>
  );
}

function MitigationItem({
  node,
  isOverdue,
  isDone,
  onToggle,
}: {
  node: KiroCanvasNode;
  isOverdue?: boolean;
  isDone?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors',
        isDone
          ? 'bg-emerald-900/30 text-emerald-300'
          : isOverdue
          ? 'bg-red-900/30 text-red-200'
          : 'bg-slate-800/60 text-slate-200',
      )}
    >
      <button
        onClick={() => onToggle(node.id)}
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        {isDone ? (
          <CheckSquare size={14} className="text-emerald-400" />
        ) : (
          <Square size={14} className="text-slate-400" />
        )}
      </button>
      <span className="flex-1 truncate">{node.label}</span>
      <span
        className={cn(
          'shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded',
          isDone
            ? 'bg-emerald-700 text-emerald-200'
            : isOverdue
            ? 'bg-red-700 text-red-200'
            : 'bg-slate-700 text-slate-300',
        )}
      >
        {isDone ? '✓' : isOverdue ? <AlertCircle size={10} className="inline" /> : null}
        {node.targetDate}
      </span>
    </div>
  );
}
