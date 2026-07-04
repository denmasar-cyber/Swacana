'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import * as d3Force from 'd3-force';
import {
  Search, ZoomIn, ZoomOut, Maximize2, Network,
} from 'lucide-react';
import { db, type KiroCanvasNode } from '@/lib/db';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  nodeType: KiroCanvasNode['nodeType'];
  noteId: string;
  status: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'parent' | 'causal';
}

const NODE_COLORS: Record<KiroCanvasNode['nodeType'], string> = {
  ROOT_CAUSE: '#ef4444',
  DIAGNOSIS: '#f59e0b',
  IMPACT: '#6366f1',
  MITIGATION: '#22c55e',
};

const NODE_LABELS: Record<KiroCanvasNode['nodeType'], string> = {
  ROOT_CAUSE: 'Root Cause',
  DIAGNOSIS: 'Diagnosis',
  IMPACT: 'Impact',
  MITIGATION: 'Mitigation',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function GraphView() {
  const router = useRouter();
  const allNodes = useLiveQuery(() => db.nodes.toArray(), [], []) as KiroCanvasNode[];
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    if (!allNodes || allNodes.length === 0) return { nodes: [], edges: [] };

    const graphNodes: GraphNode[] = allNodes.map((n, i) => ({
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
      noteId: n.noteId,
      status: n.status,
      x: 400 + Math.cos((2 * Math.PI * i) / allNodes.length) * 200,
      y: 300 + Math.sin((2 * Math.PI * i) / allNodes.length) * 200,
      vx: 0,
      vy: 0,
    }));

    const graphEdges: GraphEdge[] = [];
    for (const node of allNodes) {
      if (node.parentId) {
        graphEdges.push({
          source: node.parentId,
          target: node.id,
          type: 'parent',
        });
      }
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [allNodes]);

  // Filter nodes based on search
  const filteredNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const lower = searchQuery.toLowerCase();
    return new Set(
      nodes
        .filter((n) => n.label.toLowerCase().includes(lower))
        .map((n) => n.id),
    );
  }, [searchQuery, nodes]);

  const isDimmed = (nodeId: string) => {
    if (filteredNodeIds.size === 0 && !selectedNodeId) return false;
    if (selectedNodeId) {
      // Check if connected to selected node
      const connected = edges.filter(
        (e) => e.source === selectedNodeId || e.target === selectedNodeId,
      );
      const connectedIds = new Set(
        connected.flatMap((e) => [e.source, e.target]),
      );
      return !connectedIds.has(nodeId) && nodeId !== selectedNodeId;
    }
    return !filteredNodeIds.has(nodeId);
  };

  // Run force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    // Use 'any' types for d3-force to avoid complex type incompatibilities
    const simNodes = nodes as any[];
    const simEdges = edges as any[];

    const simulation = d3Force
      .forceSimulation(simNodes)
      .force('link', d3Force.forceLink(simEdges).id((d: any) => d.id).distance(150))
      .force('charge', d3Force.forceManyBody().strength(-300))
      .force('center', d3Force.forceCenter(400, 300))
      .force('collision', d3Force.forceCollide(50))
      .alphaDecay(0.02)
      .on('tick', () => {
        // Force re-render via state update
        setTransform((prev) => ({ ...prev }));
      });

    // Stop after some time
    const timer = setTimeout(() => simulation.stop(), 5000);

    return () => {
      clearTimeout(timer);
      simulation.stop();
    };
  }, [nodes, edges]);

  // ── Handlers ──

  const handleZoomIn = useCallback(() => {
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.3, 4) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale / 1.3, 0.2) }));
  }, []);

  const handleFitToScreen = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
    }
  }, [selectedNodeId]);

  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    router.push(`/note/${node.noteId}`);
  }, [router]);

  const handlePan = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    setTransform((prev) => ({
      ...prev,
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  }, []);

  // ── Empty state ──
  if (nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted px-8">
        <Network size={36} className="mb-3 opacity-20" />
        <p className="text-xs text-center">No nodes to display.</p>
        <p className="text-[10px] text-muted/80 text-center mt-1">Generate a mind map from the Studio panel or chat with AI.</p>
      </div>
    );
  }

  const getEdgeSource = (e: GraphEdge): string =>
    typeof e.source === 'string' ? e.source : (e.source as any).id || '';
  const getEdgeTarget = (e: GraphEdge): string =>
    typeof e.target === 'string' ? e.target : (e.target as any).id || '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <div className="relative flex-1">
          <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes... (filter by label)"
            className="w-full bg-surface text-foreground text-[10px] rounded pl-6 pr-2 py-1.5 border border-border focus:outline-none focus:border-accent placeholder:text-muted" />
        </div>

        <div className="flex items-center gap-0.5 bg-surface rounded-lg border border-border p-0.5">
          <button onClick={handleZoomIn} className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground transition-colors" title="Zoom In"><ZoomIn size={12} /></button>
          <button onClick={handleZoomOut} className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground transition-colors" title="Zoom Out"><ZoomOut size={12} /></button>
          <button onClick={handleFitToScreen} className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground transition-colors" title="Fit to Screen"><Maximize2 size={12} /></button>
        </div>

        <span className="text-[9px] text-muted">{nodes.length} nodes</span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-background relative">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseMove={handlePan}
          className="cursor-grab active:cursor-grabbing"
        >
          <g
            transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const sourceId = getEdgeSource(edge);
              const targetId = getEdgeTarget(edge);
              const source = nodes.find((n) => n.id === sourceId);
              const target = nodes.find((n) => n.id === targetId);
              if (!source || !target) return null;

              return (
                <line
                  key={`edge-${i}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className="graph-edge"
                  data-highlighted={
                    selectedNodeId !== null &&
                    (source.id === selectedNodeId || target.id === selectedNodeId)
                  }
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                className="graph-node"
                data-dimmed={isDimmed(node.id)}
                onClick={() => handleNodeClick(node)}
                onDoubleClick={() => handleNodeDoubleClick(node)}
                transform={`translate(${node.x},${node.y})`}
                style={{ cursor: 'pointer' }}
              >
                <circle r={selectedNodeId === node.id ? 24 : 20}
                  fill={NODE_COLORS[node.nodeType]}
                  opacity={selectedNodeId === node.id ? 1 : 0.8}
                  stroke={selectedNodeId === node.id ? '#ffffff' : 'transparent'} strokeWidth={2} />
                <text textAnchor="middle" dy={35} fill="var(--fg)" fontSize="10"
                  fontFamily="var(--font-geist-sans), system-ui" style={{ pointerEvents: 'none' }}>
                  {node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label}
                </text>
                <text textAnchor="middle" dy={-28} fill="var(--muted)" fontSize="8" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                  {NODE_LABELS[node.nodeType]}
                </text>
                {node.nodeType === 'MITIGATION' && (
                  <text x={16} y={-4} fill={node.status === 'DONE' ? 'var(--success)' : 'var(--warning)'} fontSize="10" style={{ pointerEvents: 'none' }}>
                    {node.status === 'DONE' ? '✓' : '○'}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>

        {/* Info overlay */}
        {selectedNodeId && (
          <div className="absolute bottom-3 left-3 glass rounded-lg px-3 py-2 text-xs max-w-xs">
            {(() => {
              const node = nodes.find((n) => n.id === selectedNodeId);
              if (!node) return null;
              return (
                <>
                  <p className="font-semibold text-foreground">{node.label}</p>
                  <p className="text-[10px] text-muted mt-0.5">{NODE_LABELS[node.nodeType]}{node.status === 'DONE' && ' · Done'}</p>
                  <p className="text-[9px] text-muted mt-0.5">Double-click to open note</p>
                </>
              );
            })()}
          </div>
        )}

        <div className="absolute bottom-3 right-3 glass rounded-lg px-2.5 py-1.5 text-[9px] text-muted space-y-0.5">
          {Object.entries(NODE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: NODE_COLORS[type as KiroCanvasNode['nodeType']] }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
