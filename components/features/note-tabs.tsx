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
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 shrink-0">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              'text-xs px-3 py-1.5 rounded border transition-colors',
              active
                ? 'bg-indigo-600/20 border-indigo-400/50 text-indigo-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

