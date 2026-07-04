'use client';

import { cn } from '@/lib/utils';

export type NoteTabKey = 'chat' | 'mindmap' | 'mitigation';

interface TabDef {
  key: NoteTabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'mindmap', label: 'Mindmapping' },
  { key: 'mitigation', label: 'Mitigation deadline' },
];

export function NoteTabs({
  value,
  onChange,
}: {
  value: NoteTabKey;
  onChange: (v: NoteTabKey) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-all',
              active
                ? 'bg-accent/15 border-accent/30 text-foreground font-medium'
                : 'bg-surface2 border-border text-muted hover:text-foreground hover:bg-surface3',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
