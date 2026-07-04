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
import CollaborationBar from '@/components/features/collaboration-bar';
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

      const parsed = sanitizeAndParseJSON(fullBuffer);
      if (parsed.length > 0) {
        const withNote = parsed.map((n) => ({ ...n, noteId }));

        await db.nodes.where('noteId').equals(noteId).delete();
        await db.nodes.bulkAdd(withNote);

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
      <div className="min-h-screen bg-[#0a0a0f] text-[#6b6b80] flex items-center justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  const mitigationNodes = (nodes ?? []).filter((n) => n.nodeType === 'MITIGATION');

  return (
    <div className="h-screen bg-[#0a0a0f] text-[#e8e8ed] flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2a3a] bg-[#0d0d15]/80 backdrop-blur-sm shrink-0">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 rounded-lg hover:bg-[#1a1a25] text-[#6b6b80] hover:text-white transition-all"
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
            className="bg-[#12121a] text-white text-sm rounded-lg px-3 py-1.5 border border-[#2a2a3a] focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/30 w-64"
          />
        ) : (
          <button
            onClick={() => {
              setTitleDraft(note.title);
              setEditingTitle(true);
            }}
            className="flex items-center gap-2 text-sm font-semibold hover:text-[#8b5cf6] transition-colors group"
          >
            {note.title}
            <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#6b6b80]" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Panel Tabs */}
          <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-0.5 border border-[#2a2a3a]">
            <button
              onClick={() => setActivePanel('editor')}
              className={cn(
                'text-[10px] px-3 py-1.5 rounded-md transition-all font-medium',
                activePanel === 'editor'
                  ? 'bg-gradient-to-r from-[#7c3aed]/20 to-[#6366f1]/10 text-white border border-[#7c3aed]/20'
                  : 'text-[#6b6b80] hover:text-white',
              )}
            >
              Notes
            </button>
            <button
              onClick={() => setActivePanel('explorer')}
              className={cn(
                'text-[10px] px-3 py-1.5 rounded-md transition-all font-medium',
                activePanel === 'explorer'
                  ? 'bg-gradient-to-r from-[#7c3aed]/20 to-[#6366f1]/10 text-white border border-[#7c3aed]/20'
                  : 'text-[#6b6b80] hover:text-white',
              )}
            >
              Data Explorer
            </button>
          </div>
          <CollaborationBar noteId={noteId} />
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Row 1: Note Editor / Data Explorer */}
        <div className="flex-1 min-h-0 border-b border-[#2a2a3a]">
          {activePanel === 'editor' ? (
            <NoteEditor key={noteId} noteId={noteId} initialContent={note.content} />
          ) : (
            <DataExplorer />
          )}
        </div>

        {/* Row 2: AI Chat */}
        <div className="h-64 shrink-0 border-b border-[#2a2a3a] flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#2a2a3a]/50 shrink-0">
            <span className="text-[10px] font-semibold text-[#8b5cf6] flex items-center gap-1.5">
              <LayoutGrid size={10} />
              AI Chat
            </span>
            <span className="text-[9px] text-[#6b6b80]">WebLLM · 100% Local</span>
          </div>
          <div className="flex-1 min-h-0">
            <ChatConsole onStream={handleStream} />
          </div>
        </div>

        {/* Row 3: Toolbar with Mindmap + Mitigation */}
        <div className="h-60 shrink-0 flex">
          <button
            onClick={() => setShowToolbar((v) => !v)}
            className="w-6 shrink-0 flex items-center justify-center border-r border-[#2a2a3a] hover:bg-[#1a1a25] transition-colors text-[#6b6b80] hover:text-white"
            title={showToolbar ? 'Hide toolbar' : 'Show toolbar'}
          >
            <div className="w-0.5 h-8 rounded-full bg-[#2a2a3a]" />
          </button>

          {showToolbar && (
            <>
              {/* View toggle */}
              <div className="w-24 shrink-0 flex flex-col border-r border-[#2a2a3a] p-1.5 gap-1 bg-[#0d0d15]/50">
                <p className="text-[8px] uppercase tracking-[0.15em] text-[#6b6b80] font-semibold px-1 pt-1">View</p>
                <button
                  onClick={() => setBottomView('mindmap')}
                  className={cn(
                    'text-[10px] px-2 py-1.5 rounded-md transition-all text-left font-medium',
                    bottomView === 'mindmap' || bottomView === 'both'
                      ? 'bg-gradient-to-r from-[#7c3aed]/20 to-[#6366f1]/10 text-white border border-[#7c3aed]/20'
                      : 'text-[#6b6b80] hover:text-white hover:bg-[#1a1a25]',
                  )}
                >
                  Mind Map
                </button>
                <button
                  onClick={() => setBottomView('mitigation')}
                  className={cn(
                    'text-[10px] px-2 py-1.5 rounded-md transition-all text-left font-medium',
                    bottomView === 'mitigation' || bottomView === 'both'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'text-[#6b6b80] hover:text-white hover:bg-[#1a1a25]',
                  )}
                >
                  Deadlines
                </button>
                <button
                  onClick={() => setBottomView('both')}
                  className={cn(
                    'text-[10px] px-2 py-1.5 rounded-md transition-all text-left font-medium',
                    bottomView === 'both'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'text-[#6b6b80] hover:text-white hover:bg-[#1a1a25]',
                  )}
                >
                  Both
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex">
                {(bottomView === 'mindmap' || bottomView === 'both') && (
                  <div className={cn(
                    'flex flex-col min-w-0',
                    bottomView === 'both' ? 'w-1/2 border-r border-[#2a2a3a]' : 'flex-1',
                  )}>
                    <div className="px-3 py-1.5 border-b border-[#2a2a3a]/50 shrink-0 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-[#8b5cf6]">Mind Map</span>
                      <span className="text-[9px] text-[#6b6b80] ml-auto">{nodes?.length ?? 0} nodes</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <KiroCanvasWorkspace nodes={nodes ?? []} onToggleDone={handleToggleDone} />
                    </div>
                  </div>
                )}

                {(bottomView === 'mitigation' || bottomView === 'both') && (
                  <div className={cn(
                    'flex flex-col min-w-0',
                    bottomView === 'both' ? 'w-1/2' : 'flex-1',
                  )}>
                    <div className="px-3 py-1.5 border-b border-[#2a2a3a]/50 shrink-0 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-amber-400">Mitigation Deadline</span>
                      <span className="text-[9px] text-[#6b6b80] ml-auto">{mitigationNodes.length} tasks</span>
                    </div>
                    <div className="flex-1 min-h-0 p-2">
                      <MitigationListView mitigations={mitigationNodes} onToggleDone={handleToggleDone} />
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
      <div className="h-full flex flex-col items-center justify-center text-[#6b6b80]">
        <CalendarClock size={24} className="mb-2 opacity-30" />
        <p className="text-xs text-center">No mitigation tasks yet.</p>
        <p className="text-[10px] text-[#6b6b80] text-center mt-1">
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
      {pending.filter((n) => n.targetDate! < today).map((n) => (
        <MitigationItem key={n.id} node={n} isOverdue onToggle={onToggleDone} />
      ))}
      {pending.filter((n) => n.targetDate! >= today).map((n) => (
        <MitigationItem key={n.id} node={n} onToggle={onToggleDone} />
      ))}
      {done.map((n) => (
        <MitigationItem key={n.id} node={n} isDone onToggle={onToggleDone} />
      ))}
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
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all',
      isDone
        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
        : isOverdue
        ? 'bg-red-500/10 text-red-200 border border-red-500/20'
        : 'bg-[#12121a] text-[#e8e8ed] border border-[#2a2a3a] hover:border-[#8b5cf6]/20',
    )}>
      <button onClick={() => onToggle(node.id)} className="shrink-0 hover:opacity-80 transition-opacity">
        {isDone ? (
          <CheckSquare size={14} className="text-emerald-400" />
        ) : (
          <Square size={14} className="text-[#6b6b80]" />
        )}
      </button>
      <span className="flex-1 truncate">{node.label}</span>
      <span className={cn(
        'shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full',
        isDone ? 'bg-emerald-500/20 text-emerald-300' :
        isOverdue ? 'bg-red-500/20 text-red-300' :
        'bg-[#1a1a25] text-[#6b6b80]',
      )}>
        {isDone ? '✓ Done' : isOverdue ? `⚠ ${node.targetDate}` : node.targetDate}
      </span>
    </div>
  );
}
