'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckSquare, Square } from 'lucide-react';
import type { KiroCanvasNode } from '@/lib/db';
import { cn } from '@/lib/utils';

const NODE_STYLES: Record<KiroCanvasNode['nodeType'], string> = {
  ROOT_CAUSE: 'bg-slate-700 border-2 border-slate-400 text-slate-100',
  DIAGNOSIS:  'bg-amber-900/60 border border-amber-500 text-amber-100',
  IMPACT:     'bg-orange-900/60 border border-orange-500 text-orange-100',
  MITIGATION: 'bg-emerald-900/60 border-2 border-emerald-400 text-emerald-100',
};

const NODE_BADGE: Record<KiroCanvasNode['nodeType'], string> = {
  ROOT_CAUSE: 'bg-slate-500 text-slate-100',
  DIAGNOSIS:  'bg-amber-600 text-white',
  IMPACT:     'bg-orange-600 text-white',
  MITIGATION: 'bg-emerald-600 text-white',
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
        'rounded-lg px-3 py-2 w-[220px] shadow-lg',
        NODE_STYLES[node.nodeType],
        isDone && 'opacity-60',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

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

      {/* Mitigation controls */}
      {node.nodeType === 'MITIGATION' && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => node.onToggleDone?.(node.id)}
            className="flex items-center gap-1 text-[11px] hover:opacity-80 transition-opacity"
            title={isDone ? 'Mark as pending' : 'Mark as done'}
          >
            {isDone ? (
              <CheckSquare size={14} className="text-emerald-300" />
            ) : (
              <Square size={14} className="text-emerald-400" />
            )}
            <span>{isDone ? 'Done' : 'Mark done'}</span>
          </button>
          {node.targetDate && (
            <span
              className={cn(
                'text-[10px] ml-auto px-1.5 py-0.5 rounded',
                isDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-800 text-emerald-300',
              )}
            >
              {node.targetDate}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

export default memo(KiroNode);
