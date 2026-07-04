'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Clock, ZoomIn, ZoomOut } from 'lucide-react';
import { db, type KiroCanvasNode } from '@/lib/db';
import { cn } from '@/lib/utils';

type ZoomLevel = 'week' | 'month' | 'quarter' | 'year';

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

const ZOOM_DAYS: Record<ZoomLevel, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

export default function TimelineView() {
  const router = useRouter();
  const allNodes = useLiveQuery(() => db.nodes.toArray(), [], []) as KiroCanvasNode[];
  const notes = useLiveQuery(() => db.notes.toArray(), [], []) as Array<{ id: string; title: string }>;

  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [groupBy, setGroupBy] = useState<'nodeType' | 'status'>('nodeType');

  // Filter to MITIGATION nodes with targetDate
  const mitigations = useMemo(
    () =>
      (allNodes as KiroCanvasNode[])
        .filter((n) => n.nodeType === 'MITIGATION' && n.targetDate)
        .sort((a, b) => (a.targetDate! > b.targetDate! ? 1 : -1)),
    [allNodes],
  );

  // Calculate date range
  const dateRange = useMemo(() => {
    if (mitigations.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      };
    }

    const dates = mitigations.map((n) => new Date(n.targetDate!).getTime());
    const minDate = new Date(Math.min(...dates));
    minDate.setDate(minDate.getDate() - 14);
    const maxDate = new Date(Math.max(...dates));
    maxDate.setDate(maxDate.getDate() + 30);

    return { start: minDate, end: maxDate };
  }, [mitigations]);

  const today = new Date();

  // Group data
  const groupedData = useMemo(() => {
    if (groupBy === 'nodeType') {
      return [
        {
          label: 'ROOT_CAUSE',
          items: mitigations.filter((n) => n.nodeType === 'MITIGATION'),
        },
      ];
    }

    return [
      {
        label: 'PENDING',
        items: mitigations.filter((n) => n.status === 'PENDING'),
      },
      {
        label: 'DONE',
        items: mitigations.filter((n) => n.status === 'DONE'),
      },
    ];
  }, [mitigations, groupBy]);

  const totalDays =
    (dateRange.end.getTime() - dateRange.start.getTime()) /
    (1000 * 60 * 60 * 24);

  const getBarPosition = (targetDate: string) => {
    const d = new Date(targetDate);
    const ms = d.getTime() - dateRange.start.getTime();
    const days = ms / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min((days / totalDays) * 100, 100));
  };

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers: { label: string; position: number }[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const ms = current.getTime() - dateRange.start.getTime();
      const days = ms / (1000 * 60 * 60 * 24);
      markers.push({
        label: current.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        position: (days / totalDays) * 100,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [dateRange, totalDays]);

  const getNoteTitle = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    return note?.title || 'Unknown';
  };

  const zoomIn = () => {
    const levels: ZoomLevel[] = ['year', 'quarter', 'month', 'week'];
    const idx = levels.indexOf(zoom);
    if (idx > 0) setZoom(levels[idx - 1]);
  };

  const zoomOut = () => {
    const levels: ZoomLevel[] = ['week', 'month', 'quarter', 'year'];
    const idx = levels.indexOf(zoom);
    if (idx > 0) setZoom(levels[idx - 1]);
  };

  if (mitigations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted px-8">
        <Clock size={36} className="mb-3 opacity-20" />
        <p className="text-xs text-center">No mitigation tasks with deadlines.</p>
        <p className="text-[10px] text-muted text-center mt-1">Generate mitigation plans from the Studio panel.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted font-semibold flex items-center gap-1">
          <Clock size={10} /> Timeline
        </span>

        <div className="flex items-center gap-0.5 bg-surface rounded-lg border border-border p-0.5 ml-auto">
          {(['week', 'month', 'quarter', 'year'] as ZoomLevel[]).map((level) => (
            <button key={level} onClick={() => setZoom(level)}
              className={cn('px-2 py-1 text-[9px] rounded transition-colors font-medium',
                zoom === level ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground')}>
              {ZOOM_LABELS[level]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-0.5">
          <button onClick={() => setGroupBy('nodeType')}
            className={cn('px-2 py-1 text-[9px] rounded transition-colors', groupBy === 'nodeType' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground')}>Type</button>
          <button onClick={() => setGroupBy('status')}
            className={cn('px-2 py-1 text-[9px] rounded transition-colors', groupBy === 'status' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground')}>Status</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 note-scroll">
        <div className="relative">
          <div className="flex mb-6 relative h-4">
            {monthMarkers.map((marker, i) => (
              <div key={i} className="absolute text-[8px] text-muted font-mono"
                style={{ left: `${marker.position}%`, transform: 'translateX(-50%)' }}>{marker.label}</div>
            ))}
          </div>

          <div className="space-y-4">
            {groupedData.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">{group.label.replace('_', ' ')}</span>
                  <span className="text-[8px] text-muted">{group.items.length}</span>
                </div>

                <div className="relative h-8">
                  <div className="absolute top-0 bottom-0 w-px bg-accent/50 z-10"
                    style={{ left: `${getBarPosition(today.toISOString().split('T')[0])}%` }} />

                  {group.items.map((node) => {
                    const isDone = node.status === 'DONE';
                    const isOverdue = !isDone && node.targetDate! < today.toISOString().split('T')[0];
                    const pos = getBarPosition(node.targetDate!);

                    return (
                      <button key={node.id} onClick={() => router.push(`/note/${node.noteId}`)}
                        className="absolute h-6 rounded transition-all hover:opacity-80 flex items-center"
                        style={{ left: `${Math.max(0, pos - 5)}%`, width: '10%', top: `${group.items.indexOf(node) * 28 + 4}px` }}>
                        <div className={cn('w-full flex items-center px-2 rounded h-5',
                          isDone ? 'bg-success' : isOverdue ? 'bg-danger opacity-60' : 'bg-warning')}>
                          <span className="text-[8px] text-white font-medium truncate">{node.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-border shrink-0 flex items-center gap-3 text-[9px] text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success" /> Done</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-warning" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-danger opacity-60" /> Overdue</span>
        <span className="flex items-center gap-1"><span className="w-px h-3 bg-accent" /> Today</span>
        <span className="ml-auto">{mitigations.filter((n) => n.status === 'DONE').length}/{mitigations.length} done</span>
      </div>
    </div>
  );
}
