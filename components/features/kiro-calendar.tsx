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
      <div className="h-full rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
        No mitigation deadlines yet
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-slate-700 bg-slate-900 overflow-y-auto px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">
        Mitigation Calendar
      </p>
      <ul className="space-y-1.5">
        {sorted.map((n) => {
          const isDone = n.status === 'DONE';
          const isOverdue = !isDone && n.targetDate! < today;

          return (
            <li
              key={n.id}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-xs',
                isDone
                  ? 'bg-emerald-900/40 text-emerald-300'
                  : isOverdue
                  ? 'bg-red-900/40 text-red-300'
                  : 'bg-slate-800 text-slate-300',
              )}
            >
              {isDone ? (
                <CalendarCheck size={13} className="shrink-0 text-emerald-400" />
              ) : (
                <CalendarClock
                  size={13}
                  className={cn('shrink-0', isOverdue ? 'text-red-400' : 'text-amber-400')}
                />
              )}
              <span className="flex-1 truncate font-medium">{n.label}</span>
              <span
                className={cn(
                  'shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded',
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isOverdue
                    ? 'bg-red-700 text-white'
                    : 'bg-slate-700 text-slate-300',
                )}
              >
                {isDone ? '✓ Done' : n.targetDate}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
