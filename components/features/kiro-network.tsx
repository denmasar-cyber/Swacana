'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import {
  Plus, FileText, Trash2, Clock, Sparkles, Menu,
  Moon, Sun, Download, Upload, Lightbulb, BookOpen,
  Search, Pin, HelpCircle, Check,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { AnimateIn, HoverLift, StaggerGroup } from '@/design-system/components/Motion';
import Button from '@/design-system/components/Button';
import Badge from '@/design-system/components/Badge';

const CausalCorrelationGraph = dynamic(() => import('./causal-correlation'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-muted text-xs"><div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2" /> Loading graph...</div>,
});
import { requestNotificationPermission, startNotificationMonitor, stopNotificationMonitor } from '@/lib/notification-manager';
import { autoLoadRequiredModels, getModelStatus, subscribeModelStatus, loadGenerationModel, loadEmbeddingModel, type AIModelEntry } from '@/lib/ai-requirements';
import { seedDemoData, resetAndSeed } from '@/lib/seed';
import AISearch from './ai-search';
import ActivityTimeline from './activity-timeline';
import CliDashboardBridge from './cli-dashboard-bridge';

type HomeView = 'board' | 'graph' | 'timeline' | 'search';

// ─── Analysis Templates ────────────────────────────────────
const ANALYSIS_TEMPLATES = [
  {
    title: '🧠 Analisis Diri & Pengembangan',
    description: 'Petakan kekuatan, kelemahan, dan rencana pengembangan diri',
    tags: ['Pengembangan Diri', 'Karir', 'Psikologis'],
  },
  {
    title: '📚 Analisis Belajar & Akademik',
    description: 'Evaluasi metode belajar, target akademik, dan solusi hambatan',
    tags: ['Belajar', 'Akademik', 'Sekolah'],
  },
  {
    title: '💼 Analisis Karir & Masa Depan',
    description: 'Rencanakan jalur karir, skill yang dibutuhkan, dan langkah strategis',
    tags: ['Karir', 'Masa Depan', 'Skill'],
  },
  {
    title: '🧘 Analisis Kesehatan Mental',
    description: 'Petakan kondisi psikologis, stresor, dan strategi coping',
    tags: ['Kesehatan Mental', 'Psikologis', 'Self-care'],
  },
  {
    title: '🎯 Analisis Proyek & Target',
    description: 'Break down proyek besar jadi langkah-langkah actionable',
    tags: ['Proyek', 'Target', 'Produktivitas'],
  },
  {
    title: '🌱 Analisis Relasi & Sosial',
    description: 'Evaluasi hubungan personal, dinamika sosial, dan komunikasi',
    tags: ['Relasi', 'Sosial', 'Psikologis'],
  },
];

export default function KiroNetwork() {
  const router = useRouter();
  const [view, setView] = useState<HomeView>('board');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [aiModels, setAiModels] = useState<AIModelEntry[]>([]);
  const [aiLoadProgress, setAiLoadProgress] = useState<Record<string, { text: string; progress: number }>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const allNodes = useLiveQuery(() => db.nodes.toArray(), []);

  // ── Theme ──
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('swacana-theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const saved = localStorage.getItem('swacana-theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // ── AI Model Status Tracking ──
  const refreshModels = useCallback(() => {
    setAiModels([...getModelStatus()]);
  }, []);

  useEffect(() => {
    refreshModels();
    const unsub = subscribeModelStatus((id, status) => {
      refreshModels();
      if (status.progress) {
        setAiLoadProgress((prev) => ({ ...prev, [id]: { text: status.progress!.text, progress: status.progress!.progress } }));
      }
      if (status.loaded) {
        setAiLoadProgress((prev) => { const next = { ...prev }; delete next[id]; return next; });
        setAiLoadingId((cur) => (cur === id ? null : cur));
      }
      if (!status.loading && !status.loaded) {
        setAiLoadingId((cur) => (cur === id ? null : cur));
      }
    });
    const interval = setInterval(refreshModels, 3000);
    return () => { unsub(); clearInterval(interval); };
  }, [refreshModels]);

  const handleRetryModel = useCallback(async (model: AIModelEntry) => {
    setAiLoadingId(model.id);
    setAiLoadProgress((prev) => ({ ...prev, [model.id]: { text: 'Memuat ulang...', progress: 0 } }));
    try {
      if (model.type === 'embedding') {
        await loadEmbeddingModel((p) => {
          setAiLoadProgress((prev) => ({ ...prev, [model.id]: { text: p.message || 'Memuat...', progress: p.total > 0 ? p.current / p.total : 0 } }));
        });
      } else {
        await loadGenerationModel(model.id, (p) => {
          setAiLoadProgress((prev) => ({ ...prev, [model.id]: { text: p.text, progress: p.progress } }));
        });
      }
    } catch (err) {
      setAiLoadProgress((prev) => ({ ...prev, [model.id]: { text: `Gagal: ${(err as Error).message}`, progress: 0 } }));
    } finally {
      setAiLoadingId(null);
      refreshModels();
    }
  }, [refreshModels]);

  // ── Auto-seed on first mount if DB is empty ──
  useEffect(() => {
    requestNotificationPermission();
    startNotificationMonitor(60000);
    autoLoadRequiredModels(); // Start downloading AI models immediately
    return () => { stopNotificationMonitor(); };
  }, []);

  const [seeding, setSeeding] = useState(false);
  useEffect(() => {
    if (notes !== undefined && notes.length === 0 && !seeding) {
      setSeeding(true);
      seedDemoData().catch(console.error).finally(() => setSeeding(false));
    }
  }, [notes, seeding]);

  const createNote = async (title?: string, content?: string) => {
    const id = crypto.randomUUID();
    await db.notes.add({
      id,
      title: title || 'Catatan Baru',
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatMode: 'default',
      chatModeCustomPrompt: null,
    });
    router.push(`/note/${id}`);
  };

  const createFromTemplate = async (template: typeof ANALYSIS_TEMPLATES[0]) => {
    setShowTemplates(false);
    await createNote(template.title, '');
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Hapus catatan ini dan semua datanya?')) return;
    await db.nodes.where('noteId').equals(id).delete();
    await db.chatMessages.where('noteId').equals(id).delete();
    const dsIds = (await db.datasets.where('noteId').equals(id).primaryKeys()) as string[];
    await db.chunks.where('noteId').equals(id).delete();
    await db.embeddings.where('noteId').equals(id).delete();
    await db.datasets.bulkDelete(dsIds);
    await db.notes.delete(id);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdue = (allNodes ?? []).filter(
    (n) => n.nodeType === 'MITIGATION' && n.status === 'PENDING' && n.targetDate && n.targetDate < today
  );
  const dueSoon = (allNodes ?? []).filter(
    (n) => n.nodeType === 'MITIGATION' && n.status === 'PENDING' && n.targetDate && n.targetDate === today
  );
  const totalMitigations = (allNodes ?? []).filter((n) => n.nodeType === 'MITIGATION').length;

  // Format relative date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const getContentPreview = (content: string, maxLen = 120) => {
    if (!content) return '';
    const clean = content.replace(/[#*_~`>\]\[]/g, '').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
  };

  return (
    <div className={cn('h-screen flex overflow-hidden', isDark ? 'dark' : '')}>
      {/* ── Minimal Sidebar ── */}
      <aside className={cn(
        'flex flex-col border-r shrink-0 transition-all duration-300 z-20 bg-surface/90 backdrop-blur-sm overflow-hidden',
        'border-border',
        sidebarOpen ? 'w-64' : 'w-0',
      )}>
        {/* Scrollable sidebar content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden note-scroll flex flex-col">
        <div className="px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-lg shadow-accent/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Swacana</h1>
              <p className="text-[10px] text-muted tracking-wider">Papan Catatan</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 shrink-0 space-y-2">
          <button onClick={() => createNote()}
            className="w-full flex items-center justify-center gap-2 clay-btn text-xs font-medium">
            <Plus size={14} />
            Catatan Baru
          </button>
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-surface2 text-foreground hover:bg-surface3 border border-border transition-all">
            <Lightbulb size={14} />
            Template
          </button>
          <button onClick={() => router.push('/tutorial')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-surface2 text-foreground hover:bg-surface3 border border-border transition-all">
            <HelpCircle size={14} />
            Tutorial
          </button>
          {showTemplates && (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-border p-1.5 bg-surface2 animate-scale-in">
              {ANALYSIS_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => createFromTemplate(t)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface3 transition-colors">
                  <p className="text-[11px] font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-[9px] text-muted line-clamp-1">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="px-3 pb-2 shrink-0">
          <p className="section-title px-1">Tampilan</p>
          <div className="space-y-0.5">
            {[
              { key: 'board' as HomeView, icon: Pin, label: 'Papan', desc: 'Catatan dalam grid' },
              { key: 'graph' as HomeView, icon: FileText, label: 'Peta Kausal', desc: 'Hubungan antar catatan' },
              { key: 'timeline' as HomeView, icon: Clock, label: 'Timeline', desc: 'Aktivitas & tenggat' },
              { key: 'search' as HomeView, icon: Search, label: 'Cari', desc: 'Temukan catatan' },
            ].map((vb) => (
              <button key={vb.key} onClick={() => setView(vb.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left',
                  view === vb.key
                    ? 'bg-accent/12 text-foreground border border-accent/20'
                    : 'text-muted hover:text-foreground hover:bg-surface2',
                )}>
                <vb.icon size={14} className={view === vb.key ? 'text-accent' : ''} />
                <div className="flex-1">
                  <span>{vb.label}</span>
                  <span className="block text-[9px] text-muted">{vb.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CLI Dashboard Bridge — show CLI agent data inside sidebar */}
        <CliDashboardBridge />

        {/* ── AI Model Status ── */}
        <div className="px-3 py-3 border-t border-border">
          <p className="section-title px-1 flex items-center gap-1.5">
            <Download size={10} />
            Model AI
          </p>
          <div className="space-y-1.5">
            {aiModels.map((model) => {
              const progress = aiLoadProgress[model.id];
              const isLoading = aiLoadingId === model.id || model.loading;
              const progressPct = progress ? Math.round(progress.progress * 100) : 0;
              return (
                <div key={model.id} className="rounded-lg border border-border bg-surface px-2.5 py-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium text-foreground truncate block">{model.name}</span>
                      <span className="text-[8px] text-muted">{model.size}</span>
                    </div>
                    {model.loaded ? (
                      <span className="text-[8px] text-success flex items-center gap-0.5 shrink-0">
                        <Check size={8} /> Siap
                      </span>
                    ) : isLoading ? (
                      <span className="text-[8px] text-accent shrink-0">{progressPct}%</span>
                    ) : (
                      <button onClick={() => handleRetryModel(model)}
                        className="text-[8px] text-muted hover:text-accent transition-colors shrink-0">
                        Muat
                      </button>
                    )}
                  </div>
                  {(isLoading || (progress && progress.progress > 0)) && !model.loaded && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-surface2 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }} />
                      </div>
                      {progress && (
                        <p className="text-[7px] text-muted mt-0.5 truncate">{progress.text}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        </div>
        {/* Sticky bottom actions */}
        <div className="px-3 py-3 border-t border-border shrink-0 space-y-2 bg-surface/90 backdrop-blur-sm">
          <button onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] text-muted hover:text-foreground hover:bg-surface2 border border-border transition-all">
            {isDark ? <Sun size={11} /> : <Moon size={11} />}
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </button>
          <div className="flex gap-2">
            <button onClick={async () => {
              const allNotes = await db.notes.toArray();
              const allNodesData = await db.nodes.toArray();
              const data = { notes: allNotes, nodes: allNodesData, exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `swacana-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] text-muted hover:text-foreground hover:bg-surface2 border border-border transition-all">
              <Download size={11} /> Export
            </button>
            <button onClick={() => resetAndSeed()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] text-muted hover:text-foreground hover:bg-surface2 border border-border transition-all">
              <Upload size={11} /> Reset
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 vintage-paper">
        {/* Top Bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/70 backdrop-blur-sm shrink-0">
          <button onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-xl hover:bg-surface2 text-muted hover:text-foreground transition-all">
            <Menu size={16} />
          </button>

          <span className="text-[10px] text-muted font-medium">{notes?.length ?? 0} catatan</span>

          {overdue.length + dueSoon.length > 0 && (
            <span className="flex items-center gap-1 clay-badge text-[9px]">
              {overdue.length + dueSoon.length} tenggat
            </span>
          )}

          {totalMitigations > 0 && (
            <span className="text-[9px] text-muted ml-auto">
              {allNodes?.filter(n => n.nodeType === 'MITIGATION' && n.status === 'DONE').length ?? 0}/{totalMitigations} selesai
            </span>
          )}
        </header>

        {/* ── Content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden note-scroll">
          {(!notes || notes.length === 0) && view === 'board' ? (
            /* ── Empty State ── */
            <div className="h-full flex flex-col items-center justify-center px-6 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-2xl shadow-accent/25 mb-8 animate-float">
                <Sparkles size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Papan Catatanmu</h2>
              <p className="text-sm text-muted text-center max-w-md leading-relaxed mb-10">
                Tulis curhatan, diary, atau tujuan — AI akan otomatis memetakan solusi, plan, dan korelasi kausal antar semuanya.
              </p>

              <StaggerGroup delay={50} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl w-full mb-10">
                {ANALYSIS_TEMPLATES.map((t, i) => (
                  <HoverLift key={i} scale={1.02} lift={3}>
                    <button onClick={() => createFromTemplate(t)}
                      className="w-full clay-card p-5 text-left">
                      <p className="text-sm font-semibold text-foreground mb-1.5">{t.title}</p>
                      <p className="text-[11px] text-muted leading-relaxed">{t.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {t.tags.map((tag) => (
                          <span key={tag} className="tag tag-accent text-[8px]">{tag}</span>
                        ))}
                      </div>
                    </button>
                  </HoverLift>
                ))}
              </StaggerGroup>

              <AnimateIn preset="bounce" delay={300}>
                <Button variant="primary" size="lg" onClick={() => createNote()} className="animate-soft-glow">
                  <Plus size={18} />
                  Mulai Catatan Baru
                </Button>
              </AnimateIn>
            </div>
          ) : view === 'board' ? (
            /* ── Pinterest Grid ── */
            <StaggerGroup delay={30} className="pinboard">
              {/* Add Note Card */}
              <HoverLift scale={1.03} lift={4}>
                <button onClick={() => createNote()}
                  className="w-full pinboard-card flex flex-col items-center justify-center min-h-[180px] bg-surface2/60 border-dashed border-2 border-border/60 hover:border-accent/40 hover:bg-accent/5 group">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Plus size={24} className="text-accent/60" />
                  </div>
                  <p className="text-xs font-medium text-muted group-hover:text-accent transition-colors">Catatan Baru</p>
                </button>
              </HoverLift>

              {/* Note Cards */}
              {notes?.map((note) => {
                const noteOverdue = overdue.filter((n) => n.noteId === note.id);
                const preview = getContentPreview(note.content);
                return (
                  <HoverLift key={note.id} scale={1.02} lift={3}>
                    <div onClick={() => router.push(`/note/${note.id}`)}
                      className="pinboard-card group cursor-pointer">
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 flex-1">
                          {note.title}
                        </h3>
                        <button onClick={(e) => deleteNote(e, note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-surface3 text-muted hover:text-danger transition-all shrink-0 -mt-0.5 -mr-1">
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Content Preview */}
                      {preview && (
                        <p className="text-[11px] text-muted/80 leading-relaxed line-clamp-4 mb-3">
                          {preview}
                        </p>
                      )}

                      {/* Tags from content */}
                      {noteOverdue.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="tag tag-danger text-[8px]">{noteOverdue.length} overdue</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                        <span className="text-[9px] text-muted/60">{formatDate(note.updatedAt)}</span>
                        <span className="flex items-center gap-1 text-[9px] text-muted/40">
                          {(note.content?.length ?? 0) > 0 && <BookOpen size={9} />}
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverLift>
                );
              })}
          </StaggerGroup>
          ) : view === 'graph' ? (
            <CausalCorrelationGraph />
          ) : view === 'timeline' ? (
            <ActivityTimeline />
          ) : (
            <AISearch />
          )}
        </div>
      </div>
    </div>
  );
}
