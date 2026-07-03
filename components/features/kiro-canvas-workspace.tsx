'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { KiroCanvasNode } from '@/lib/db';
import { computeKiroLayout } from '@/lib/omni-client';
import KiroNode from './kiro-node';
import KiroCalendar from './kiro-calendar';

interface Props {
  nodes: KiroCanvasNode[];
  onToggleDone: (id: string) => void;
}

const nodeTypes = { kiroNode: KiroNode };

export default function KiroCanvasWorkspace({ nodes, onToggleDone }: Props) {
  const { flowNodes, flowEdges } = useMemo(() => {
    return computeKiroLayout(nodes);
  }, [nodes]);

  // Inject the callback into each node's data
  const enrichedNodes = useMemo(
    () =>
      flowNodes.map((n) => ({
        ...n,
        data: { ...n.data, onToggleDone },
      })),
    [flowNodes, onToggleDone],
  );

  const mitigationNodes = useMemo(
    () => nodes.filter((n) => n.nodeType === 'MITIGATION'),
    [nodes],
  );

  return (
    <div className="flex flex-col h-full gap-2">
      {/* React Flow canvas — 70% height */}
      <div className="flex-1 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 min-h-0">
        {enrichedNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500 text-sm">
            Describe your problem in the chat — the decision tree will appear here.
          </div>
        ) : (
          <ReactFlow
            nodes={enrichedNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} color="#334155" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const t = ((n.data as any) as KiroCanvasNode).nodeType;
                if (t === 'ROOT_CAUSE') return '#475569';
                if (t === 'DIAGNOSIS') return '#d97706';
                if (t === 'IMPACT') return '#ea580c';
                return '#059669';
              }}
              style={{ background: '#0f172a' }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Calendar widget — 30% height */}
      <div className="h-48 shrink-0">
        <KiroCalendar mitigations={mitigationNodes} />
      </div>
    </div>
  );
}
