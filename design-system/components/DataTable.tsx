'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  compact?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data',
  onRowClick,
  className,
  compact = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  // Filter
  const filtered = search
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  // Sort
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className={cn('flex flex-col border border-border rounded-xl overflow-hidden bg-surface', className)}>
      {/* Search Bar */}
      {searchable && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface2/50">
          <Search size={12} className="text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted/50 focus:outline-none"
          />
          <span className="text-[9px] text-muted">{filtered.length} rows</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-[9px] uppercase tracking-wider text-muted font-semibold py-2 px-3',
                    col.sortable && 'cursor-pointer hover:text-foreground select-none',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable && sortKey === col.key && (
                      <ArrowUpDown size={9} className={cn('transition-transform', sortDir === 'desc' && 'rotate-180')} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-muted text-xs">
                  <div className="flex flex-col items-center">
                    <Filter size={20} className="opacity-20 mb-1" />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-border/50 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-accent/5' : '',
                    compact ? '' : '',
                  )}
                  onClick={() => onRowClick?.(row, page * pageSize + i)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'text-xs text-foreground',
                        compact ? 'py-1.5 px-2' : 'py-2.5 px-3',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row, page * pageSize + i)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface2/30">
          <span className="text-[9px] text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground disabled:opacity-30 transition-all">
              <ChevronLeft size={12} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const pg = start + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={cn(
                    'w-6 h-6 rounded text-[9px] font-medium transition-all',
                    pg === page ? 'bg-accent text-white' : 'text-muted hover:text-foreground hover:bg-surface2',
                  )}>
                  {pg + 1}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground disabled:opacity-30 transition-all">
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
