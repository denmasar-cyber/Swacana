'use client';

import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';

import { db } from '@/lib/db';
import { streamLLM, sanitizeAndParseJSON } from '@/lib/omni-client';
import type { LoadProgress } from '@/lib/webllm-client';
import ChatConsole from '@/components/features/chat-console';
import KiroCanvasWorkspace from '@/components/features/kiro-canvas-workspace';

interface Props {
  noteId: string;
}

export default function NoteWorkspace({ noteId }: Props) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

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

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top bar */}
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
            className="flex-1 bg-slate-800 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none"
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

        <span className="ml-auto text-[10px] text-slate-500 uppercase tracking-widest">
          100% Local · Zero Cloud · Free
        </span>
      </header>

      {/* Main 2-panel layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
        {/* Left: Chat Console — cols 1-5 */}
        <div className="col-span-5 border-r border-slate-700 flex flex-col overflow-hidden">
          <ChatConsole onStream={handleStream} />
        </div>

        {/* Right: Kiro Canvas Workspace — cols 6-12 */}
        <div className="col-span-7 p-3 flex flex-col overflow-hidden min-h-0">
          <KiroCanvasWorkspace
            nodes={nodes ?? []}
            onToggleDone={handleToggleDone}
          />
        </div>
      </div>
    </div>
  );
}
