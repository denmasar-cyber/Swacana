'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckSquare, Square } from 'lucide-react';
import type { KiroCanvasNode } from '@/lib/db';
import { cn } from '@/lib/utils';

const NODE_STYLES: Record<KiroCanvasNode['nodeType'], string> = {
  ROOT_CAUSE: 'bg-danger/15 border-2 border-danger/50 text-foreground',
  DIAGNOSIS:  'bg-warning/15 border border-warning/50 text-foreground',
  IMPACT:     'bg-accent2/15 border border-accent2/50 text-foreground',
  MITIGATION: 'bg-success/15 border-2 border-success/50 text-foreground',
};

const NODE_BADGE: Record<KiroCanvasNode['nodeType'], string> = {
  ROOT_CAUSE: 'bg-danger/30 text-danger',
  DIAGNOSIS:  'bg-warning/30 text-warning',
  IMPACT:     'bg-accent2/30 text-accent2',
  MITIGATION: 'bg-success/30 text-success',
};

interface KiroNodeData extends KiroCanvasNode {
  onToggleDone?: (id: string) => void;
}

function KiroNode({ data }: NodeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node = data as any as KiroNodeData;
  const isDone = node.status === 'DONE';

  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3 w-[220px] shadow-xl border',
        NODE_STYLES[node.nodeType],
        isDone && 'opacity-50',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border !w-3 !h-3 !border-2 !border-surface" />

      {/* Badge */}
      <span
        className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
          NODE_BADGE[node.nodeType],
        )}
      >
        {node.nodeType.replace('_', ' ')}
      </span>

      {/* Label */}
      <p className="mt-1 text-sm font-semibold leading-tight">{node.label}</p>

      {/* Details (truncated) */}
      <p className="mt-1 text-[11px] opacity-80 leading-snug break-words whitespace-pre-wrap">
        {node.details}
      </p>

      {node.nodeType === 'MITIGATION' && (
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => node.onToggleDone?.(node.id)}
            className="flex items-center gap-1 text-[11px] hover:opacity-80 transition-opacity"
            title={isDone ? 'Mark as pending' : 'Mark as done'}>
            {isDone ? <CheckSquare size={14} className="text-success" /> : <Square size={14} className="text-success" />}
            <span>{isDone ? 'Done' : 'Mark done'}</span>
          </button>
          {node.targetDate && (
            <span className={cn('text-[10px] ml-auto px-1.5 py-0.5 rounded',
              isDone ? 'bg-success text-white' : 'bg-success/20 text-success')}>
              {node.targetDate}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-border !w-3 !h-3 !border-2 !border-surface" />
    </div>
  );
}

export default memo(KiroNode);
