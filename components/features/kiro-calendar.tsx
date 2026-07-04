'use client';

import { useMemo } from 'react';
import { CalendarCheck, CalendarClock } from 'lucide-react';
import type { KiroCanvasNode } from '@/lib/db';
import { cn } from '@/lib/utils';

interface Props {
  mitigations: KiroCanvasNode[];
}

export default function KiroCalendar({ mitigations }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const sorted = useMemo(
    () =>
      [...mitigations]
        .filter((n) => n.targetDate)
        .sort((a, b) => (a.targetDate! > b.targetDate! ? 1 : -1)),
    [mitigations],
  );

  if (sorted.length === 0) {
    return (
      <div className="h-full rounded-lg border border-dashed border-border bg-surface/50 flex items-center justify-center text-muted text-xs">
        <CalendarClock size={14} className="mr-1.5 opacity-50" />
        No mitigation deadlines yet
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border bg-surface overflow-y-auto px-3 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <CalendarClock size={12} className="text-accent" />
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">Mitigation Calendar</p>
        <span className="text-[9px] text-muted ml-auto">{sorted.length}</span>
      </div>
      <ul className="space-y-1">
        {sorted.map((n) => {
          const isDone = n.status === 'DONE';
          const isOverdue = !isDone && n.targetDate! < today;

          return (
            <li key={n.id}
              className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-all',
                isDone ? 'bg-success/10 text-success' : isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface2 text-foreground')}>
              {isDone ? <CalendarCheck size={13} className="shrink-0 text-success" /> : <CalendarClock size={13} className={cn('shrink-0', isOverdue ? 'text-danger' : 'text-warning')} />}
              <span className="flex-1 truncate font-medium">{n.label}</span>
              <span className={cn('shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded',
                isDone ? 'bg-success/20 text-success' : isOverdue ? 'bg-danger/20 text-danger' : 'bg-surface3 text-muted')}>
                {isDone ? '✓ Done' : n.targetDate}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
