'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import {
  Plus, FileText, Trash2, AlertTriangle, Network, Bell, Clock,
  Search, Database, Sparkles, Menu, ChevronRight
} from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const allNodes = useLiveQuery(() => db.nodes.toArray(), []);

  // ── Auto-seed on first mount if DB is empty ──
  useEffect(() => {
    requestNotificationPermission();
    startNotificationMonitor(60000);
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
    { key: 'graph', icon: Network, label: 'Causal Map' },
    { key: 'timeline', icon: Clock, label: 'Timeline' },
    { key: 'search', icon: Search, label: 'Search' },
  ];

  return (
    <div className="h-screen bg-[#0a0a0f] text-[#e8e8ed] flex overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className={cn(
        'flex flex-col border-r border-[#2a2a3a] bg-[#0d0d15] transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-72' : 'w-0 overflow-hidden',
      )}>
        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-[#2a2a3a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6366f1] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Swacana</h1>
              <p className="text-[9px] text-[#6b6b80] tracking-wider">Decision Intelligence</p>
            </div>
          </div>
        </div>

        {/* New Analysis Button */}
        <div className="px-3 py-3 shrink-0">
          <button
            onClick={createNote}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
          >
            <Plus size={14} />
            New Analysis
          </button>
        </div>

        {/* View Switcher */}
        <div className="px-3 pb-2 shrink-0">
          <p className="text-[9px] uppercase tracking-[0.15em] text-[#6b6b80] font-semibold mb-2 px-1">Views</p>
          <div className="space-y-0.5">
            {VIEW_BUTTONS.map((vb) => (
              <button
                key={vb.key}
                onClick={() => setView(vb.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left',
                  view === vb.key
                    ? 'bg-gradient-to-r from-[#7c3aed]/15 to-[#6366f1]/10 text-white border border-[#7c3aed]/20'
                    : 'text-[#6b6b80] hover:text-white hover:bg-[#1a1a25]',
                )}
              >
                <vb.icon size={14} className={view === vb.key ? 'text-[#8b5cf6]' : ''} />
                {vb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Analyses List */}
        <div className="flex-1 min-h-0 px-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#6b6b80] font-semibold">
              Analyses
            </p>
            <span className="text-[9px] text-[#6b6b80]">{notes?.length ?? 0}</span>
          </div>
          <div className="h-full overflow-y-auto space-y-0.5 pb-4">
            {!notes || notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#6b6b80] text-xs text-center px-4">
                <FileText size={20} className="mb-2 opacity-30" />
                <p>No analyses yet.</p>
              </div>
            ) : (
              notes.map((note) => {
                const noteOverdue = overdue.filter((n) => n.noteId === note.id);
                const noteDueSoon = dueSoon.filter((n) => n.noteId === note.id);
                return (
                  <div
                    key={note.id}
                    onClick={() => router.push(`/note/${note.id}`)}
                    className={cn(
                      'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                      'hover:bg-[#1a1a25] border border-transparent hover:border-[#2a2a3a]',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-medium text-[#e8e8ed] truncate">{note.title}</h3>
                        {(noteOverdue.length > 0 || noteDueSoon.length > 0) && (
                          <AlertTriangle size={10} className="text-red-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#6b6b80] mt-0.5">
                        {new Date(note.updatedAt).toLocaleDateString()}
                        {note.content?.length > 0 && ' · ✎'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteNote(e, note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#6b6b80] hover:text-red-400 hover:bg-[#2a2a3a] transition-all shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                    <ChevronRight size={11} className="text-[#6b6b80] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-3 border-t border-[#2a2a3a] shrink-0">
          <button
            onClick={() => resetAndSeed()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] text-[#6b6b80] hover:text-white hover:bg-[#1a1a25] border border-[#2a2a3a] transition-all"
          >
            <Database size={11} />
            Reseed Demo Data
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2a3a] bg-[#0d0d15]/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-[#1a1a25] text-[#6b6b80] hover:text-white transition-all"
          >
            <Menu size={16} />
          </button>

          {/* Notifications & Status */}
          <div className="ml-auto flex items-center gap-3">
            {/* Notification indicator */}
            <span className={cn(
              'flex items-center gap-1 text-[10px] px-2 py-1 rounded-full',
              notificationsEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-[#1a1a25] text-[#6b6b80] border border-[#2a2a3a]',
            )}>
              <Bell size={10} />
              {notificationsEnabled ? 'On' : 'Off'}
            </span>

            {/* Reminder bell with popover */}
            {(overdue.length > 0 || dueSoon.length > 0) && (
              <div className="relative group">
                <button className="p-1.5 rounded-lg bg-[#1a1a25] hover:bg-[#2a2a3a] border border-[#2a2a3a] transition-all relative">
                  <Bell size={14} className={cn(overdue.length > 0 ? 'text-red-400' : 'text-amber-400')} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-[7px] flex items-center justify-center font-bold shadow-lg">
                    {overdue.length + dueSoon.length}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#12121a] border border-[#2a2a3a] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden animate-scale-in">
                  <div className="px-3 py-2 border-b border-[#2a2a3a] bg-[#0d0d15]">
                    <p className="text-[10px] font-semibold text-[#e8e8ed]">Reminders</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                    {overdue.map((n) => (
                      <button key={n.id} onClick={() => router.push(`/note/${n.noteId}`)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#1a1a25] text-left transition-all">
                        <AlertTriangle size={10} className="text-red-400 shrink-0" />
                        <span className="flex-1 text-[11px] text-[#e8e8ed] truncate">{n.label}</span>
                        <span className="text-[9px] text-red-400 shrink-0 font-mono">{n.targetDate}</span>
                      </button>
                    ))}
                    {dueSoon.map((n) => (
                      <button key={n.id} onClick={() => router.push(`/note/${n.noteId}`)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#1a1a25] text-left transition-all">
                        <Bell size={10} className="text-amber-400 shrink-0" />
                        <span className="flex-1 text-[11px] text-[#e8e8ed] truncate">{n.label}</span>
                        <span className="text-[9px] text-amber-400 shrink-0">Due today</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Local badge */}
            <span className="text-[9px] px-2 py-1 rounded-full bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/20 flex items-center gap-1">
              <Sparkles size={9} />
              100% Local
            </span>
          </div>
        </header>

        {/* View Panel */}
        <div className="flex-1 min-h-0">
          {view === 'graph' && <CausalCorrelationGraph />}
          {view === 'timeline' && <ActivityTimeline />}
          {view === 'search' && <AISearch />}
        </div>
      </div>
    </div>
  );
}
