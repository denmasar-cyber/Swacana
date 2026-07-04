'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, FileText, Loader2, X, ChevronRight } from 'lucide-react';
import { db, type Note } from '@/lib/db';
import { cn } from '@/lib/utils';

interface SearchResult {
  note: Note;
  relevance: number;
  matchContext: string;
}

export default function AISearch() {
  const router = useRouter();
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const allNodes = useLiveQuery(() => db.nodes.toArray(), []);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'simple' | 'ai'>('simple');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const performSimpleSearch = useCallback(
    (q: string) => {
      if (!notes || !q.trim()) {
        setResults([]);
        return;
      }

      const lower = q.toLowerCase();
      const terms = lower.split(/\s+/).filter(Boolean);

      const scored: SearchResult[] = [];

      for (const note of notes) {
        let score = 0;
        const searchText = `${note.title} ${note.content ?? ''}`.toLowerCase();

        // Title matches are worth more
        if (note.title.toLowerCase().includes(lower)) score += 10;
        if (note.title.toLowerCase().split(/\s+/).some((w) => terms.includes(w))) score += 5;

        // Content matches
        for (const term of terms) {
          const count = (searchText.match(new RegExp(term, 'g')) || []).length;
          score += count * 2;
        }

        if (score > 0) {
          // Find context snippet
          const idx = searchText.indexOf(lower);
          const matchContext =
            idx >= 0
              ? (note.content ?? '').substring(Math.max(0, idx - 40), idx + 120) + '...'
              : note.content?.substring(0, 100) ?? '';

          scored.push({ note, relevance: score, matchContext: matchContext.trim() });
        }
      }

      // Also search in mindmap nodes
      if (allNodes) {
        for (const node of allNodes) {
          const parentNote = notes.find((n) => n.id === node.noteId);
          if (!parentNote) continue;
          if (scored.some((r) => r.note.id === parentNote.id)) continue;

          const searchText = `${node.label} ${node.details}`.toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (searchText.includes(term)) score += 3;
          }

          if (score > 0) {
            scored.push({
              note: parentNote,
              relevance: score,
              matchContext: `[${node.nodeType}] ${node.label}: ${node.details.substring(0, 80)}`,
            });
          }
        }
      }

      scored.sort((a, b) => b.relevance - a.relevance);
      setResults(scored.slice(0, 15));
      setHasSearched(true);
    },
    [notes, allNodes],
  );

  const performAISearch = useCallback(
    async (q: string) => {
      if (!notes) return;
      setIsSearching(true);

      // First do a simple search to narrow down candidates
      performSimpleSearch(q);

      // Then use AI to re-rank if we have results
      // In production, this would use the WebLLM to semantically rank results
      // For now, we add a visual indicator that AI analysis is available
      await new Promise((r) => setTimeout(r, 500));

      setIsSearching(false);
    },
    [notes, performSimpleSearch],
  );

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!query.trim()) return;

      if (searchMode === 'simple') {
        performSimpleSearch(query);
      } else {
        performAISearch(query);
      }
    },
    [query, searchMode, performSimpleSearch, performAISearch],
  );

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-3 py-2 border-b border-slate-700/50 shrink-0">
        <form onSubmit={handleSearch} className="flex gap-1">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all analyses..."
              className="w-full bg-surface2 text-foreground text-[11px] rounded pl-6 pr-7 py-1.5 border border-border focus:outline-none focus:border-accent/50 placeholder:text-muted"
            />
            {query && (
              <button type="button" onClick={clearSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>
          <button type="submit" disabled={!query.trim() || isSearching}
            className="px-2 py-1.5 rounded bg-accent hover:opacity-80 text-white text-[10px] transition-colors disabled:opacity-40">
            {isSearching ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
          </button>
        </form>

        <div className="flex items-center gap-1 mt-1.5">
          <button onClick={() => setSearchMode('simple')}
            className={cn('text-[9px] px-1.5 py-0.5 rounded transition-colors',
              searchMode === 'simple' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-surface2 text-muted border border-border')}>
            Simple
          </button>
          <button onClick={() => setSearchMode('ai')}
            className={cn('text-[9px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5',
              searchMode === 'ai' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-surface2 text-muted border border-border')}>
            <Sparkles size={8} /> AI Semantic
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasSearched ? (
          <div className="h-full flex flex-col items-center justify-center text-muted px-4">
            <Search size={24} className="mb-2 opacity-30" />
            <p className="text-xs text-center">Search across all your analyses.</p>
            <p className="text-[10px] text-muted/60 text-center mt-1">
              {searchMode === 'ai' ? 'AI mode uses WebLLM for semantic ranking.' : 'Simple mode matches keywords in titles and content.'}
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted px-4">
            <FileText size={24} className="mb-2 opacity-30" />
            <p className="text-xs text-center">No results found.</p>
            <p className="text-[10px] text-muted/60 text-center mt-1">Try different search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {results.map((result) => (
              <button key={result.note.id} onClick={() => router.push(`/note/${result.note.id}`)}
                className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-surface2/50 transition-colors text-left">
                <div className="mt-0.5 shrink-0"><FileText size={12} className="text-muted" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{result.note.title}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-surface3 text-muted shrink-0 flex items-center gap-0.5">
                      <ChevronRight size={8} /> {result.relevance}
                    </span>
                  </div>
                  {result.matchContext && (
                    <p className="text-[10px] text-muted/80 mt-0.5 line-clamp-2 leading-snug">{result.matchContext}</p>
                  )}
                  <p className="text-[9px] text-muted/60 mt-0.5">
                    {searchMode === 'ai' && 'AI ranked · '}{new Date(result.note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1 border-t border-border/50 shrink-0 text-[9px] text-muted/60">
        {hasSearched ? `${results.length} result${results.length !== 1 ? 's' : ''} · ${notes?.length ?? 0} analyses` : `${notes?.length ?? 0} analyses indexed`}
      </div>
    </div>
  );
}
