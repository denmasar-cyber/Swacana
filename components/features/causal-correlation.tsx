'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, AlertTriangle, FileText } from 'lucide-react';
import { db, type Note } from '@/lib/db';
import { cn } from '@/lib/utils';

// ─── Color palette for causal edges ──────────────────────────────────────
const CAUSAL_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
];

// ─── Compute causal correlations between notes ───────────────────────────
function computeCausalCorrelations(notes: Note[]): { nodes: Node[]; edges: Edge[] } {
  if (notes.length === 0) return { nodes: [], edges: [] };

  const flowNodes: Node[] = notes.map((note, i) => {
    // Spread notes in a circle pattern
    const angle = (2 * Math.PI * i) / Math.max(notes.length, 1) - Math.PI / 2;
    const radius = Math.max(notes.length * 60, 200);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // Extract keywords from title for matching
    const keywords = note.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    return {
      id: note.id,
      type: 'default',
      position: { x, y },
      data: {
        label: note.title,
        keywords,
        date: note.updatedAt,
        content: note.content,
      },
      style: {
        background: '#1e293b',
        border: `2px solid ${CAUSAL_COLORS[i % CAUSAL_COLORS.length]}40`,
        borderRadius: '12px',
        color: '#e2e8f0',
        fontSize: '11px',
        padding: '8px 12px',
        width: 160,
        boxShadow: `0 0 20px ${CAUSAL_COLORS[i % CAUSAL_COLORS.length]}20`,
      },
    };
  });

  // Create edges based on shared keywords and close creation dates
  const edges: Edge[] = [];
  let edgeColorIdx = 0;

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const a = flowNodes[i].data as { keywords: string[]; date: string; content: string };
      const b = flowNodes[j].data as { keywords: string[]; date: string; content: string };
      let correlation = 0;

      // Keyword overlap
      const shared = a.keywords.filter((k) => b.keywords.includes(k));
      correlation += shared.length * 0.3;

      // Temporal proximity
      const dateDiff = Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime());
      if (dateDiff < 7 * 24 * 60 * 60 * 1000) correlation += 0.5;
      if (dateDiff < 24 * 60 * 60 * 1000) correlation += 0.8;

      // Content overlap (if both have content)
      if (a.content && b.content) {
        const aWords = new Set(a.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const bWords = new Set(b.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        let sharedContent = 0;
        aWords.forEach((w) => { if (bWords.has(w)) sharedContent++; });
        const overlap = sharedContent / Math.min(aWords.size, bWords.size);
        if (overlap > 0.1) correlation += overlap * 0.5;
      }

      if (correlation > 0.3) {
        const color = CAUSAL_COLORS[edgeColorIdx % CAUSAL_COLORS.length];
        edgeColorIdx++;
        edges.push({
          id: `causal-${i}-${j}`,
          source: notes[i].id,
          target: notes[j].id,
          animated: true,
          label: correlation > 1.0 ? 'Strong' : correlation > 0.5 ? 'Moderate' : 'Weak',
          labelStyle: {
            fontSize: 9,
            fill: '#94a3b8',
            background: '#0f172a',
            padding: '2px 6px',
            borderRadius: 4,
          },
          style: {
            stroke: color,
            strokeWidth: Math.min(correlation, 1.5),
            strokeDasharray: correlation < 0.5 ? '4 4' : undefined,
          },
        });
      }
    }
  }

  return { nodes: flowNodes, edges };
}

// ─── Home Page Causal Correlation Component ─────────────────────────────
export default function CausalCorrelationGraph() {
  const router = useRouter();
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const allNodes = useLiveQuery(() => db.nodes.toArray(), []);

  const { nodes, edges } = useMemo(() => computeCausalCorrelations(notes ?? []), [notes]);

  // Count overdue mitigations for reminders
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = (allNodes ?? []).filter(
    (n) => n.nodeType === 'MITIGATION' && n.status === 'PENDING' && n.targetDate && n.targetDate < today
  ).length;

  const totalMitigations = (allNodes ?? []).filter((n) => n.nodeType === 'MITIGATION').length;
  const correlationCount = edges.length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-slate-700/50 shrink-0">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
            <FileText size={10} />
            Analyses
          </div>
          <p className="text-lg font-bold text-slate-100 mt-0.5">{notes?.length ?? 0}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
            <Network size={10} />
            Correlations
          </div>
          <p className="text-lg font-bold text-indigo-300 mt-0.5">{correlationCount}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
            <AlertTriangle size={10} />
            Overdue
          </div>
          <p className={cn(
            'text-lg font-bold mt-0.5',
            overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'
          )}>
            {overdueCount}
            <span className="text-[10px] text-slate-500 font-normal ml-1">
              / {totalMitigations} tasks
            </span>
          </p>
        </div>
      </div>

      {/* Causal correlation graph */}
      <div className="flex-1 min-h-0">
        {(!notes || notes.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 px-8">
            <Network size={36} className="mb-3 opacity-20" />
            <p className="text-xs text-center">No analyses yet.</p>
            <p className="text-[10px] text-slate-600 text-center mt-1">
              Create an analysis to see the causal correlation network.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={2}
            onNodeClick={(_, node) => router.push(`/note/${node.id}`)}
          >
            <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={30} size={1} />
            <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&_button]:!border-slate-600 [&_button]:!text-slate-400 [&_button]:!bg-slate-800 [&_button]:hover:!bg-slate-700" />
            <MiniMap
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
              nodeColor="#334155"
              maskColor="rgba(15,23,42,0.7)"
            />
          </ReactFlow>
        )}
      </div>

      {/* Legend */}
      {notes && notes.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-700/50 shrink-0 flex items-center gap-3 text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded bg-indigo-400 inline-block" />
            Strong
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded bg-violet-400 inline-block" />
            Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded bg-slate-500 inline-block" style={{ borderTop: '1px dashed' }} />
            Weak
          </span>
          <span className="ml-auto text-slate-600">
            Click a node to open analysis
          </span>
        </div>
      )}
    </div>
  );
}
