'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { KiroCanvasNode } from '@/lib/db';
import { computeKiroLayout } from '@/lib/omni-client';
import { GitBranch } from 'lucide-react';
import KiroNode from './kiro-node';
import KiroCalendar from './kiro-calendar';
import { cn } from '@/lib/utils';

interface Props {
  nodes: KiroCanvasNode[];
  onToggleDone: (id: string) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const nodeTypes = { kiroNode: KiroNode };

export default function KiroCanvasWorkspace({ nodes, onToggleDone }: Props) {
  const { flowNodes, flowEdges } = useMemo(() => {
    return computeKiroLayout(nodes);
  }, [nodes]);

  const enrichedNodes = useMemo(
    () => flowNodes.map((n) => ({ ...n, data: { ...n.data, onToggleDone } })),
    [flowNodes, onToggleDone],
  );

  const mitigationNodes = useMemo(
    () => nodes.filter((n) => n.nodeType === 'MITIGATION'),
    [nodes],
  );

  return (
    <div className="flex flex-col h-full gap-2">
      <div className={cn(
        'flex-1 rounded-xl overflow-hidden border bg-surface/80 min-h-0 transition-all',
        enrichedNodes.length === 0 ? 'border-dashed border-border' : 'border-border',
      )}>
        {enrichedNodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted px-6 text-center gap-2 animate-fade-in">
            <GitBranch size={32} className="opacity-20" />
            <p className="text-sm font-medium text-foreground/60">Belum ada decision tree</p>
            <p className="text-[10px] text-muted/60 max-w-xs leading-relaxed">
              Chat dengan AI di panel kiri untuk memulai pemetaan masalahmu menjadi decision tree yang terstruktur.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={enrichedNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={2.5}
          >
            <Background variant={BackgroundVariant.Dots} color="var(--border)" gap={24} size={1.5} />
            <Controls
              className="!bg-surface !border-border !rounded-lg shadow-lg [&_button]:!border-border [&_button]:!text-muted [&_button]:!bg-surface [&_button]:hover:!bg-surface2 [&_button]:!transition-colors"
            />
          </ReactFlow>
        )}
      </div>

      <div className="h-48 shrink-0">
        <KiroCalendar mitigations={mitigationNodes} />
      </div>
    </div>
  );
}