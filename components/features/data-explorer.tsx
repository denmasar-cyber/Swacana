'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Database, ExternalLink, ChevronRight, ChevronDown, BookOpen, Brain, Heart, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface HFDataset {
  _id: string;
  id: string;
  author: string;
  description: string;
  downloads: number;
  likes: number;
  lastModified: string;
  createdAt: string;
  private: boolean;
  gated: boolean | string;
  tags: string[];
  sha: string;
}

interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  size: string;
  format: string;
  url: string;
  license: string;
  downloads: number;
  likes: number;
  author: string;
  lastModified: string;
  tags: string[];
}

// ─── Tag parsing helpers ────────────────────────────────────────────────────

function parseTags(tags: string[]): {
  category: string;
  size: string;
  format: string;
  license: string;
} {
  const categoryTag = tags.find((t) => t.startsWith('task_categories:'))?.split(':')[1];
  const sizeTag = tags.find((t) => t.startsWith('size_categories:'))?.split(':')[1];
  const formatTag = tags.find((t) => t.startsWith('format:'))?.split(':')[1];
  const licenseTag = tags.find((t) => t.startsWith('license:'))?.split(':')[1];

  const categoryMap: Record<string, string> = {
    'text-generation': 'Text Generation',
    'text-classification': 'Text Classification',
    'token_classification': 'Token Classification',
    'question-answering': 'QA',
    'translation': 'Translation',
    'summarization': 'Summarization',
    'sentence-similarity': 'Semantic Similarity',
    'natural-language-inference': 'NLI',
    'fill-mask': 'Fill Mask',
    'image-classification': 'Image Classification',
    'object-detection': 'Object Detection',
    'image-segmentation': 'Image Segmentation',
    'text-to-image': 'Text-to-Image',
    'image-to-text': 'Image-to-Text',
    'speech-recognition': 'Speech Recognition',
    'audio-classification': 'Audio Classification',
    'reinforcement-learning': 'Reinforcement Learning',
    'tabular-classification': 'Tabular Classification',
    'tabular-regression': 'Tabular Regression',
    'other': 'Other',
  };

  const sizeMap: Record<string, string> = {
    'n<1K': '<1K',
    '1K<n<10K': '1K-10K',
    '10K<n<100K': '10K-100K',
    '100K<n<1M': '100K-1M',
    '1M<n<10M': '1M-10M',
    '10M<n<100M': '10M-100M',
    '100M<n<1B': '100M-1B',
    '1B<n<10B': '1B-10B',
    '10B<n<100B': '10B-100B',
    '100B<n<1T': '100B-1T',
    'n>1T': '>1T',
  };

  return {
    category: categoryMap[categoryTag ?? ''] || categoryTag || 'Uncategorized',
    size: sizeMap[sizeTag ?? ''] || sizeTag || 'Unknown',
    format: formatTag || 'Unknown',
    license: licenseTag?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown',
  };
}

function mapToDatasetInfo(ds: HFDataset): DatasetInfo {
  const parsed = parseTags(ds.tags);
  const [namespace] = ds.id.split('/');

  return {
    id: ds.id,
    name: ds.id,
    description: ds.description?.replace(/<[^>]*>/g, '').trim() || 'No description available.',
    category: parsed.category,
    size: parsed.size,
    format: parsed.format,
    url: `https://huggingface.co/datasets/${ds.id}`,
    license: parsed.license,
    downloads: ds.downloads,
    likes: ds.likes,
    author: namespace,
    lastModified: ds.lastModified,
    tags: ds.tags,
  };
}

// ─── Debounce hook ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Main Component ─────────────────────────────────────────────────────────

const HF_API_BASE = 'https://huggingface.co/api/datasets';
const PAGE_SIZE = 25;

export default function DataExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Data fetching state
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch datasets ──────────────────────────────────────────────────────

  const fetchDatasets = useCallback(
    async (search: string, append: boolean = false) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
        setOffset(0);
      }

      try {
        const params = new URLSearchParams();
        params.set('sort', 'downloads');
        params.set('direction', '-1');
        params.set('limit', String(PAGE_SIZE));

        // Only add search if it's not empty
        if (search) {
          params.set('search', search);
        }

        // Add offset for pagination
        if (append) {
          params.set('offset', String(offset));
        }

        // Filter to only NLP/AI relevant datasets (text modality)
        params.set('filter', 'modality:text');

        const url = `${HF_API_BASE}?${params.toString()}`;
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`API responded with ${res.status}: ${res.statusText}`);
        }

        const data: HFDataset[] = await res.json();

        // Parse link header for total count and pagination
        const linkHeader = res.headers.get('Link');
        let total = 0;
        if (linkHeader) {
          const countMatch = linkHeader.match(/total=(\d+)/);
          if (countMatch) total = parseInt(countMatch[1], 10);
        }
        setTotalCount(total || data.length);

        const mapped = data.map(mapToDatasetInfo);

        if (append) {
          setDatasets((prev) => [...prev, ...mapped]);
        } else {
          setDatasets(mapped);
          // Extract unique categories
          const cats = Array.from(new Set(mapped.map((d) => d.category)));
          setCategories(['All', ...cats.sort()]);
        }

        setOffset((prev) => prev + data.length);
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message);
        if (!append) setDatasets([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [offset],
  );

  // ── Initial fetch ───────────────────────────────────────────────────────

  useEffect(() => {
    fetchDatasets(debouncedSearch);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load more ────────────────────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchDatasets(debouncedSearch, true);
    }
  }, [fetchDatasets, isLoadingMore, hasMore, debouncedSearch]);

  // ── Refresh ──────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setOffset(0);
    fetchDatasets(debouncedSearch);
  }, [fetchDatasets, debouncedSearch]);

  // ── Filter datasets by category (client-side) ───────────────────────────

  const filtered = datasets.filter((d) => {
    return selectedCategory === 'All' || d.category === selectedCategory;
  });

  // ── Format number ────────────────────────────────────────────────────────

  const formatNum = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-2 py-1.5 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Database size={12} className="text-accent" />
          <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
            NLP &amp; AI Data Explorer
          </span>
          <span className="text-[9px] text-muted/60 ml-auto">
            via HuggingFace API
          </span>
        </div>

        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NLP datasets..."
              className="w-full bg-surface2 text-foreground text-[11px] rounded pl-6 pr-2 py-1.5 border border-border focus:outline-none focus:border-accent/50 placeholder:text-muted"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded bg-surface2 text-muted hover:bg-surface3 hover:text-foreground border border-border transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={12} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mt-1.5 max-h-10 overflow-y-auto">
          {categories.slice(0, 15).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded transition-colors',
                selectedCategory === cat
                  ? 'bg-accent/30 text-accent border border-accent/30'
                  : 'bg-surface2 text-muted hover:bg-surface3 border border-border',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {error && (
          <div className="mx-2 mt-2 px-2 py-1.5 rounded bg-danger/10 border border-danger/30 flex items-start gap-1.5">
            <AlertCircle size={11} className="text-danger mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-danger/80 leading-snug">{error}</p>
              <button onClick={handleRefresh} className="text-[10px] text-danger/70 hover:text-danger underline mt-0.5">Retry</button>
            </div>
          </div>
        )}

        {isLoading && datasets.length === 0 && (
          <div className="flex-1 flex flex-col gap-1.5 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col gap-1.5 px-2 py-2 rounded bg-surface2/30">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-2/5 rounded bg-surface3" />
                  <div className="h-2.5 w-1/6 rounded bg-surface3" />
                </div>
                <div className="h-2 w-4/5 rounded bg-surface3/70" />
                <div className="flex gap-2 mt-0.5">
                  <div className="h-2 w-12 rounded bg-surface3/50" />
                  <div className="h-2 w-10 rounded bg-surface3/50" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-muted px-4">
            <Database size={24} className="mb-2 opacity-30" />
            <p className="text-xs text-center">No datasets found.</p>
            <p className="text-[10px] text-muted/60 text-center mt-1">
              {searchQuery ? 'Try a different search term.' : 'Connect to the internet to browse HuggingFace datasets.'}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 note-scroll">
            <div className="divide-y divide-border/50">
              {filtered.map((dataset) => (
                <DatasetRow
                  key={dataset.id}
                  dataset={dataset}
                  isExpanded={expandedId === dataset.id}
                  onToggle={() => setExpandedId(expandedId === dataset.id ? null : dataset.id)}
                  formatNum={formatNum}
                  formatDate={formatDate}
                />
              ))}
            </div>

            {hasMore && (
              <div className="px-2 py-2 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-1 text-[10px] bg-surface2 hover:bg-surface3 text-foreground/80 px-3 py-1.5 rounded border border-border transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <><Loader2 size={10} className="animate-spin" /> Loading...</>
                  ) : (
                    <><Download size={10} /> Load more datasets</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-2 py-1 border-t border-border shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-muted/60">
          {totalCount > 0 ? `Showing ${filtered.length} of ${totalCount} datasets` : `${filtered.length} datasets`}
        </span>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-[9px] text-accent flex items-center gap-0.5">
              <Loader2 size={8} className="animate-spin" /> Fetching...
            </span>
          )}
          <a href="https://huggingface.co/datasets" target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-accent hover:text-accent/80 transition-colors flex items-center gap-0.5">
            Browse HuggingFace <ExternalLink size={8} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Dataset Row Component ─────────────────────────────────────────────────

function DatasetRow({
  dataset,
  isExpanded,
  onToggle,
  formatNum,
  formatDate,
}: {
  dataset: DatasetInfo;
  isExpanded: boolean;
  onToggle: () => void;
  formatNum: (n: number) => string;
  formatDate: (s: string) => string;
}) {
  const [opening, setOpening] = useState(false);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpening(true);
    window.open(dataset.url, '_blank');
    setTimeout(() => setOpening(false), 800);
  }, [dataset.url]);

  const shortName = dataset.name.split('/').pop() ?? dataset.name;
  const cleanDescription = dataset.description
    .replace(/See the full description[\s\S]*$/i, '')
    .trim()
    .substring(0, 200);

  return (
    <div>
      <div
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button" tabIndex={0}
        className="w-full flex items-start gap-2 px-2 py-2 hover:bg-surface2/50 transition-colors text-left cursor-pointer"
      >
        <div className="mt-0.5 shrink-0">
          {isExpanded ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted/80" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">{shortName}</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-surface3 text-muted shrink-0">{dataset.category}</span>
            {dataset.likes > 0 && (
              <span className="text-[9px] text-pink-400 flex items-center gap-0.5 shrink-0">
                <Heart size={8} /> {formatNum(dataset.likes)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted/80 mt-0.5 line-clamp-1">{cleanDescription || 'No description'}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[9px] text-muted/60">{dataset.author}</span>
            <span className="text-[9px] text-muted/60 flex items-center gap-0.5">
              <Download size={8} /> {formatNum(dataset.downloads)}
            </span>
            <span className="text-[9px] text-muted/60">· {dataset.size}</span>
            <span className="text-[9px] text-muted/60">· {formatDate(dataset.lastModified)}</span>
          </div>
        </div>
        <button onClick={handleOpen}
          className="shrink-0 p-1 rounded hover:bg-accent/20 text-muted hover:text-accent transition-colors relative disabled:opacity-50 disabled:cursor-wait"
          title="Open on HuggingFace" disabled={opening}>
          {opening ? (
            <span className="inline-block w-3 h-3 border-2 border-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            <ExternalLink size={12} />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-2 space-y-1.5">
          <p className="text-[11px] text-muted/80 leading-relaxed">
            {dataset.description.substring(0, 300)}{dataset.description.length > 300 && '...'}
          </p>
          <div className="flex flex-wrap gap-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface3 text-muted">Format: {dataset.format}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface3 text-muted">Size: {dataset.size}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface3 text-muted">License: {dataset.license}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface3 text-muted">{(dataset.downloads).toLocaleString()} downloads</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleOpen}
              className="flex items-center gap-1 text-[10px] bg-accent hover:opacity-80 text-white px-2 py-1 rounded transition-colors">
              <ExternalLink size={10} /> Open on HuggingFace
            </button>
            <button className="flex items-center gap-1 text-[10px] bg-surface3 hover:bg-surface2 text-foreground/80 px-2 py-1 rounded transition-colors">
              <Brain size={10} /> Analyze with AI
            </button>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted/60">
            <BookOpen size={9} />
            <span>{dataset.tags.filter((t) => !t.startsWith('region:') && !t.startsWith('library:')).slice(0, 5).join(' · ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
