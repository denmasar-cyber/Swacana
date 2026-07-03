'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

export default function KiroNetwork() {
  const router = useRouter();
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);

  const createNote = async () => {
    const id = crypto.randomUUID();
    await db.notes.add({
      id,
      title: 'New Analysis',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    router.push(`/note/${id}`);
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this analysis and all its nodes?')) return;
    await db.nodes.where('noteId').equals(id).delete();
    await db.notes.delete(id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Self-Plan Hub</h1>
            <p className="text-slate-400 text-sm mt-1">Local-first AI life management</p>
          </div>
          <button
            onClick={createNote}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Analysis
          </button>
        </div>

        {!notes || notes.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No analyses yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => router.push(`/note/${note.id}`)}
                className={cn(
                  'group relative bg-slate-800 hover:bg-slate-700 rounded-xl p-5 cursor-pointer border border-slate-700 hover:border-slate-500 transition-all',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-100 truncate">{note.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteNote(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
