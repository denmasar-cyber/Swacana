'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, FileText, GitBranch, Database,
  Plus, Sun,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Note } from '@/lib/db';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  category: 'Notes' | 'Nodes' | 'Datasets' | 'Actions';
  label: string;
  description: string;
  icon: typeof FileText;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const filteredRef = useRef<CommandItem[]>([]);

  const notes = useLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  ) as Note[];

  const allNodes = useLiveQuery(() => db.nodes.toArray(), [], []) as unknown[];
  const allDatasets = useLiveQuery(
    () => db.datasets.toArray(),
    [],
    [],
  ) as unknown[];

  const createNote = useCallback(async () => {
    const id = crypto.randomUUID();
    await db.notes.add({
      id,
      title: 'Analisis Baru',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatMode: 'default',
      chatModeCustomPrompt: null,
    });
    router.push(`/note/${id}`);
  }, [router]);

  const toggleTheme = useCallback(() => {
    document.documentElement.classList.toggle('dark');
  }, []);

  const allItems: CommandItem[] = [
    {
      id: 'new-analysis',
      category: 'Actions',
      label: 'Analisis Baru',
      description: 'Buat catatan analisis baru',
      icon: Plus,
      action: createNote,
    },
    {
      id: 'toggle-theme',
      category: 'Actions',
      label: 'Ganti Tema',
      description: 'Beralih antara mode terang dan gelap',
      icon: Sun,
      action: toggleTheme,
    },
    ...(notes as Note[]).map((note) => ({
      id: `note-${note.id}`,
      category: 'Notes' as const,
      label: note.title,
      description: new Date(note.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      icon: FileText,
      action: () => router.push(`/note/${note.id}`),
    })),
    ...(allNodes as Array<{ id: string; noteId: string; label: string; nodeType: string }>).slice(0, 20).map((node) => ({
      id: `node-${node.id}`,
      category: 'Nodes' as const,
      label: node.label,
      description: node.nodeType.replace('_', ' '),
      icon: GitBranch,
      action: () => router.push(`/note/${node.noteId}`),
    })),
    ...(allDatasets as Array<{ id: string; noteId: string; hfDatasetId: string; status: string }>).map((ds) => ({
      id: `dataset-${ds.id}`,
      category: 'Datasets' as const,
      label: ds.hfDatasetId,
      description: `Status: ${ds.status}`,
      icon: Database,
      action: () => router.push(`/note/${ds.noteId}`),
    })),
  ];

  // Filter items
  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()),
      )
    : allItems;

  filteredRef.current = filteredItems;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredRef.current.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredRef.current[activeIndex];
        if (item) {
          item.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, onClose]);

  // Focus input
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  // Group by category
  const grouped: Record<string, CommandItem[]> = {};
  for (const item of filteredItems) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const categoryOrder = ['Actions', 'Notes', 'Nodes', 'Datasets'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      <div
        className="absolute left-1/2 top-[12vh] -translate-x-1/2 w-[580px] max-w-[90vw] rounded-xl bg-surface border border-border shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search size={14} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Cari catatan, node, dataset, tindakan..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 focus:outline-none"
          />
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-surface2 text-muted border border-border font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted animate-fade-in">
              <Search size={20} className="mb-2 opacity-30" />
              <p className="text-xs">Tidak ada hasil</p>
              <p className="text-[10px] text-muted/60 mt-1">Coba kata kunci lain</p>
            </div>
          ) : (
            categoryOrder.filter((cat) => grouped[cat]).map((category) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-muted font-semibold bg-surface2/50">
                  {category === 'Actions' ? 'Tindakan' : category === 'Notes' ? 'Catatan' : category === 'Nodes' ? 'Node' : 'Dataset'}
                </div>
                {grouped[category].map((item) => {
                  const globalIdx = filteredItems.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      data-active={globalIdx === activeIndex}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-border/20 last:border-0',
                        globalIdx === activeIndex ? 'bg-accent/10' : 'hover:bg-surface2',
                      )}
                      onClick={() => { item.action(); onClose(); }}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                    >
                      <item.icon size={12} className={cn('shrink-0', globalIdx === activeIndex ? 'text-accent' : 'text-muted')} />
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-xs truncate block', globalIdx === activeIndex ? 'text-foreground font-medium' : 'text-foreground/80')}>
                          {item.label}
                        </span>
                        <span className="text-[9px] text-muted truncate block">{item.description}</span>
                      </div>
                      {globalIdx === activeIndex && (
                        <kbd className="text-[9px] px-1 py-0.5 rounded bg-accent/15 text-accent font-mono shrink-0">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-border flex items-center gap-3 text-[9px] text-muted">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surface2 border border-border font-mono">↑↓</kbd> Navigasi</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surface2 border border-border font-mono">↵</kbd> Pilih</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surface2 border border-border font-mono">Esc</kbd> Tutup</span>
          <span className="ml-auto">{filteredItems.length} hasil</span>
        </div>
      </div>
    </div>
  );
}

// ─── Global ⌘K / Ctrl+K Hook ──────────────────────────────────────────────

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
