'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, AlertTriangle, Network, Bell, Clock, Search, LayoutDashboard, Database } from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import CausalCorrelationGraph from './causal-correlation';
import ActivityTimeline from './activity-timeline';
import AISearch from './ai-search';
import { requestNotificationPermission, startNotificationMonitor, stopNotificationMonitor } from '@/lib/notification-manager';
import { seedDemoData, resetAndSeed } from '@/lib/seed';

type HomeView = 'graph' | 'timeline' | 'search';

export default function KiroNetwork() {
  const router = useRouter();
  const [view, setView] = useState<HomeView>('graph');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const allNodes = useLiveQuery(() => db.nodes.toArray(), []);

  // ── Auto-seed on first mount if DB is empty ──
  useEffect(() => {
    requestNotificationPermission();
    startNotificationMonitor(60000);
    // Check actual permission after a short delay
    const check = setTimeout(() => {
      setNotificationsEnabled(
        typeof Notification !== 'undefined' && Notification.permission === 'granted'
      );
    }, 500);
    return () => {
      clearTimeout(check);
      stopNotificationMonitor();
    };
  }, []);

  // Seed if empty
  const [seeding, setSeeding] = useState(false);
  useEffect(() => {
    if (notes !== undefined && notes.length === 0 && !seeding) {
      setSeeding(true);
      seedDemoData().catch(console.error).finally(() => setSeeding(false));
    }
  }, [notes, seeding]);

  const createNote = async () => {
    const id = crypto.randomUUID();
    await db.notes.add({
      id, title: 'New Analysis', content: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    router.push(`/note/${id}`);
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this analysis and all its nodes?')) return;
    await db.nodes.where('noteId').equals(id).delete();
    await db.notes.delete(id);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdue = (allNodes ?? []).filter(
    (n) => n.nodeType === 'MITIGATION' && n.status === 'PENDING' && n.targetDate && n.targetDate < today
  );
  const dueSoon = (allNodes ?? []).filter(
    (n) => n.nodeType === 'MITIGATION' && n.status === 'PENDING' && n.targetDate && n.targetDate === today
  );

  const VIEW_BUTTONS: { key: HomeView; icon: typeof Network; label: string }[] = [
    { key: 'graph', icon: Network, label: 'Causal Graph' },
    { key: 'timeline', icon: Clock, label: 'Timeline' },
    { key: 'search', icon: Search, label: 'Search' },
  ];

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top navigation bar */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <LayoutDashboard size={14} className="text-white" />
          </div>
          <h1 className="text-base font-bold text-slate-100">Swacana</h1>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          {VIEW_BUTTONS.map((vb) => (
            <button
              key={vb.key}
              onClick={() => setView(vb.key)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors',
                view === vb.key
                  ? 'bg-indigo-600/30 text-indigo-200'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <vb.icon size={10} />
              {vb.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Notifications indicator */}
          <span className={cn(
            'text-[9px] px-1.5 py-0.5 rounded',
            notificationsEnabled ? 'text-emerald-400' : 'text-slate-600'
          )}>
            {notificationsEnabled ? '🔔 On' : '🔕'}
          </span>

          {/* Reminder bell */}
          {(overdue.length > 0 || dueSoon.length > 0) && (
            <div className="relative group">
              <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
                <Bell size={14} className={cn(overdue.length > 0 ? 'text-red-400' : 'text-amber-400')} />
              </button>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                {overdue.length + dueSoon.length}
              </span>
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 border-b border-slate-700">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Reminders</p>
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {overdue.map((n) => (
                    <button key={n.id} onClick={() => router.push(`/note/${n.noteId}`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-700 text-left transition-colors">
                      <AlertTriangle size={10} className="text-red-400 shrink-0" />
                      <span className="flex-1 text-[10px] text-slate-300 truncate">{n.label}</span>
                      <span className="text-[9px] text-red-400 shrink-0">{n.targetDate}</span>
                    </button>
                  ))}
                  {dueSoon.map((n) => (
                    <button key={n.id} onClick={() => router.push(`/note/${n.noteId}`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-700 text-left transition-colors">
                      <Bell size={10} className="text-amber-400 shrink-0" />
                      <span className="flex-1 text-[10px] text-slate-300 truncate">{n.label}</span>
                      <span className="text-[9px] text-amber-400 shrink-0">Due today</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button onClick={() => resetAndSeed()}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
            title="Reset and re-seed demo data">
            <Database size={12} /> Reseed
          </button>
          <button onClick={createNote}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            <Plus size={14} /> New Analysis
          </button>
        </div>
      </header>

      {/* Main content: Two columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Note list */}
        <div className="w-72 shrink-0 border-r border-slate-700 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-700/50 shrink-0">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              All Analyses ({notes?.length ?? 0})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {!notes || notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4">
                <FileText size={24} className="mb-2 opacity-30" />
                <p className="text-xs text-center">No analyses yet.</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {notes.map((note) => {
                  const noteOverdue = overdue.filter((n) => n.noteId === note.id);
                  const noteDueSoon = dueSoon.filter((n) => n.noteId === note.id);
                  return (
                    <div key={note.id} onClick={() => router.push(`/note/${note.id}`)}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
                        'hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50',
                      )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-medium text-slate-200 truncate">{note.title}</h3>
                          {(noteOverdue.length > 0 || noteDueSoon.length > 0) && (
                            <AlertTriangle size={10} className="text-red-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(note.updatedAt).toLocaleDateString()}
                          {note.content?.length > 0 && ' · ✎'}
                        </p>
                      </div>
                      <button onClick={(e) => deleteNote(e, note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-all shrink-0" title="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: View panel */}
        <div className="flex-1 min-w-0">
          {view === 'graph' && <CausalCorrelationGraph />}
          {view === 'timeline' && <ActivityTimeline />}
          {view === 'search' && <AISearch />}
        </div>
      </div>
    </div>
  );
}
