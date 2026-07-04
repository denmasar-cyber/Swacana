'use client';

import { useEffect, useState } from 'react';
import {
  Terminal, HardDrive, FileText, BrainCircuit,
  Globe, Database, RefreshCw, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CliStats {
  exists: boolean;
  notes: number;
  files: number;
  chunks: number;
  memories: number;
  browserData: number;
  dbPath: string;
  error?: string;
}

interface CliNote {
  id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface CliFile {
  id: string;
  filename: string;
  extension: string;
  path: string;
  size_bytes: number;
  summary: string | null;
  indexed_at: string | null;
}

type CliTab = 'stats' | 'notes' | 'files';

export default function CliDashboardBridge() {
  const [tab, setTab] = useState<CliTab>('stats');
  const [stats, setStats] = useState<CliStats | null>(null);
  const [notes, setNotes] = useState<CliNote[]>([]);
  const [files, setFiles] = useState<CliFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchStats();
    }
  }, [expanded]);

  const handleTabChange = (newTab: CliTab) => {
    setTab(newTab);
    if (newTab === 'notes') fetchNotes();
    if (newTab === 'files') fetchFiles();
    if (newTab === 'stats') fetchStats();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  const statsCards = [
    { label: 'Catatan (CLI)', value: stats?.notes ?? 0, icon: FileText, color: 'text-accent' },
    { label: 'File Terindex', value: stats?.files ?? 0, icon: HardDrive, color: 'text-info' },
    { label: 'Chunk', value: stats?.chunks ?? 0, icon: Database, color: 'text-success' },
    { label: 'Memori AI', value: stats?.memories ?? 0, icon: BrainCircuit, color: 'text-warning' },
    { label: 'Browser Capture', value: stats?.browserData ?? 0, icon: Globe, color: 'text-info' },
  ];

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all text-left',
          expanded ? 'text-accent bg-accent/8' : 'text-muted hover:text-foreground hover:bg-surface2',
        )}
      >
        <Terminal size={14} className={expanded ? 'text-accent' : ''} />
        <span className="font-medium">CLI Agent</span>
        <span className={cn(
          'ml-auto text-[9px]',
          stats?.exists ? 'text-success' : 'text-muted',
        )}>
          {stats?.exists ? '✓' : '✗'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 animate-fade-in space-y-2">
          {/* Tab Buttons */}
          <div className="flex gap-1">
            {([
              { key: 'stats' as CliTab, label: 'Statistik' },
              { key: 'notes' as CliTab, label: 'Catatan' },
              { key: 'files' as CliTab, label: 'File' },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all',
                  tab === t.key
                    ? 'bg-accent/12 text-foreground border border-accent/20'
                    : 'text-muted hover:text-foreground hover:bg-surface2',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => handleTabChange(tab)}
            className="flex items-center gap-1 text-[9px] text-muted hover:text-accent transition-colors"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Error State */}
          {error && (
            <p className="text-[9px] text-danger/70 px-1">{error}</p>
          )}

          {/* No CLI DB */}
          {!loading && stats && !stats.exists && (
            <div className="text-center py-3">
              <Terminal size={20} className="mx-auto mb-1.5 text-muted/40" />
              <p className="text-[10px] text-muted/60">
                Database CLI belum ada. Jalankan:
              </p>
              <code className="block text-[9px] text-accent mt-1 px-2 py-1 bg-surface2 rounded-lg">
                swacana scan ./folder
              </code>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-1.5">
              {[1,2,3].map((i) => (
                <div key={i} className="skeleton h-6 rounded-lg" />
              ))}
            </div>
          )}

          {/* Stats Tab */}
          {!loading && tab === 'stats' && stats?.exists && (
            <div className="space-y-1.5">
              {statsCards.map((card) => (
                <div key={card.label}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface2/60"
                >
                  <div className="flex items-center gap-2">
                    <card.icon size={11} className={card.color} />
                    <span className="text-[10px] text-muted">{card.label}</span>
                  </div>
                  <span className={cn('text-[11px] font-bold', card.color)}>
                    {card.value}
                  </span>
                </div>
              ))}
              <p className="text-[8px] text-muted/40 pt-1 truncate" title={stats.dbPath}>
                📁 {stats.dbPath}
              </p>
            </div>
          )}

          {/* Notes Tab */}
          {!loading && tab === 'notes' && (
            <div className="space-y-1 max-h-48 overflow-y-auto note-scroll">
              {notes.length === 0 ? (
                <p className="text-[10px] text-muted/60 text-center py-3">
                  Belum ada catatan CLI
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id}
                    className="px-2.5 py-2 rounded-lg bg-surface2/60"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[10px] font-medium text-foreground line-clamp-1">
                        {note.title || '(tanpa judul)'}
                      </p>
                      <span className="tag tag-accent text-[7px] shrink-0">
                        {note.source_type}
                      </span>
                    </div>
                    {note.content && (
                      <p className="text-[9px] text-muted/70 line-clamp-2 mt-0.5">
                        {note.content.replace(/[#*_~`>\]\[]/g, '').trim().slice(0, 100)}
                      </p>
                    )}
                    <p className="text-[8px] text-muted/40 mt-0.5">
                      {formatDate(note.updated_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Files Tab */}
          {!loading && tab === 'files' && (
            <div className="space-y-1 max-h-48 overflow-y-auto note-scroll">
              {files.length === 0 ? (
                <p className="text-[10px] text-muted/60 text-center py-3">
                  Belum ada file terindex
                </p>
              ) : (
                files.map((file) => (
                  <div key={file.id}
                    className="px-2.5 py-1.5 rounded-lg bg-surface2/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-medium text-foreground truncate flex-1">
                        {file.filename}
                      </span>
                      <span className="tag tag-accent text-[7px] shrink-0">
                        .{file.extension}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-muted/40">{formatSize(file.size_bytes)}</span>
                      {file.summary && (
                        <span className="text-[8px] text-muted/60 line-clamp-1">{file.summary}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
