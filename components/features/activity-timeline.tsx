'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, type Note } from '@/lib/db';


interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'completed' | 'overdue';
  title: string;
  date: string;
  noteId: string;
  noteTitle: string;
}

function buildTimeline(notes: Note[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const note of notes) {
    events.push({
      id: `created-${note.id}`,
      type: 'created',
      title: 'Analysis created',
      date: note.createdAt,
      noteId: note.id,
      noteTitle: note.title,
    });

    // Only show updated if different from created
    if (note.updatedAt !== note.createdAt) {
      events.push({
        id: `updated-${note.id}`,
        type: 'updated',
        title: note.content ? 'Notes updated' : 'Analysis updated',
        date: note.updatedAt,
        noteId: note.id,
        noteTitle: note.title,
      });
    }
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function ActivityTimeline() {
  const router = useRouter();
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const allNodes = useLiveQuery(() => db.nodes.toArray(), []);

  const today = new Date().toISOString().split('T')[0];

  // Add mitigation events to timeline
  const events = useMemo(() => {
    const base = buildTimeline(notes ?? []);
    const mitigationEvents: TimelineEvent[] = [];

    for (const node of allNodes ?? []) {
      if (node.nodeType !== 'MITIGATION' || !node.targetDate) continue;

      const parentNote = (notes ?? []).find((n) => n.id === node.noteId);
      const noteTitle = parentNote?.title ?? 'Unknown';

      if (node.status === 'DONE') {
        mitigationEvents.push({
          id: `done-${node.id}`,
          type: 'completed',
          title: `Mitigation completed: ${node.label}`,
          date: node.targetDate, // Use target date as completion marker
          noteId: node.noteId,
          noteTitle,
        });
      } else if (node.targetDate < today) {
        mitigationEvents.push({
          id: `overdue-${node.id}`,
          type: 'overdue',
          title: `Overdue: ${node.label}`,
          date: node.targetDate,
          noteId: node.noteId,
          noteTitle,
        });
      }
    }

    return [...base, ...mitigationEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50); // Show latest 50 events
  }, [notes, allNodes, today]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return d.toLocaleDateString();
  };

  // Group events by date
  const grouped = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const ev of events) {
      const day = ev.date.split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(ev);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  if (!notes || notes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 px-4">
        <Clock size={24} className="mb-2 opacity-30" />
        <p className="text-xs text-center">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-700/50 shrink-0">
        <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
          <Clock size={10} />
          Activity Timeline
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-700" />

          {grouped.map(([day, dayEvents]) => (
            <div key={day} className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-[15px] h-[15px] rounded-full bg-slate-700 border-2 border-slate-600 shrink-0 z-10" />
                <span className="text-[10px] font-medium text-slate-400">{formatDate(day)}</span>
              </div>
              <div className="ml-6 space-y-1">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => router.push(`/note/${ev.noteId}`)}
                    className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className="mt-0.5 shrink-0">
                      {ev.type === 'created' && <FileText size={10} className="text-indigo-400" />}
                      {ev.type === 'updated' && <FileText size={10} className="text-blue-400" />}
                      {ev.type === 'completed' && <CheckCircle2 size={10} className="text-emerald-400" />}
                      {ev.type === 'overdue' && <AlertCircle size={10} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-300 truncate leading-tight">{ev.title}</p>
                      <p className="text-[8px] text-slate-600 truncate">{ev.noteTitle}</p>
                    </div>
                    <span className="text-[9px] text-slate-600 shrink-0">
                      {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
