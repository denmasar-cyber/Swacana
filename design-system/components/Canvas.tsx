'use client';

import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus, Maximize2, Grid3x3, MousePointer2, Hand } from 'lucide-react';
import { useCanvas, type CanvasConfig } from '../hooks/use-canvas';

export interface CanvasProps {
  children?: React.ReactNode;
  className?: string;
  config?: Partial<CanvasConfig>;
  toolbar?: 'top' | 'overlay' | 'none';
  onCanvasClick?: (x: number, y: number, e: React.MouseEvent) => void;
  onDrop?: (x: number, y: number, data: unknown) => void;
}

export default function Canvas({ children, className, config: initialConfig, toolbar = 'overlay', onCanvasClick, onDrop }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    config, setConfig,
    zoomIn, zoomOut, zoomToFit,
    handleMouseDown, handleMouseMove, handleMouseUp, handleWheel,
    screenToCanvas, snapToGrid,
  } = useCanvas(initialConfig);

  // Double-click to add node
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (onCanvasClick) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
      const snapped = snapToGrid(canvasPos.x, canvasPos.y);
      onCanvasClick(snapped.x, snapped.y, e);
    }
  }, [onCanvasClick, screenToCanvas, snapToGrid]);

  // Drop handler
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop_ = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!onDrop) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasPos = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    const snapped = snapToGrid(canvasPos.x, canvasPos.y);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop(snapped.x, snapped.y, data);
    } catch {
      onDrop(snapped.x, snapped.y, e.dataTransfer.getData('text/plain'));
    }
  }, [onDrop, screenToCanvas, snapToGrid]);

  return (
    <div ref={containerRef} className={cn('relative w-full h-full overflow-hidden bg-surface/30', className)}>
      {/* Grid Background */}
      {config.showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }}>
          <defs>
            <pattern id="canvas-grid" width={config.gridSize * config.zoom} height={config.gridSize * config.zoom} patternUnits="userSpaceOnUse"
              patternTransform={`translate(${config.panX * config.zoom}, ${config.panY * config.zoom})`}>
              <circle cx={0} cy={0} r={0.8} fill="var(--border)" />
              <line x1={0} y1={0} x2={config.gridSize * config.zoom} y2={0} stroke="var(--border)" strokeWidth={0.3} opacity={0.3} />
              <line x1={0} y1={0} x2={0} y2={config.gridSize * config.zoom} stroke="var(--border)" strokeWidth={0.3} opacity={0.3} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />
        </svg>
      )}

      {/* Canvas Content */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop_}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            transform: `translate(${config.panX * config.zoom}px, ${config.panY * config.zoom}px) scale(${config.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>

      {/* Toolbar Overlay */}
      {toolbar === 'overlay' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface/85 backdrop-blur-md border border-border/60 rounded-xl px-2 py-1.5 shadow-xl animate-fade-in">
          <button onClick={zoomOut} className="tool-btn" title="Zoom Out">
            <Minus size={13} />
          </button>
          <span className="text-[10px] font-mono text-muted min-w-[36px] text-center select-none">
            {Math.round(config.zoom * 100)}%
          </span>
          <button onClick={zoomIn} className="tool-btn" title="Zoom In">
            <Plus size={13} />
          </button>
          <span className="w-px h-3.5 bg-border mx-0.5" />
          <button onClick={() => zoomToFit(containerRef.current?.clientWidth || 800, containerRef.current?.clientHeight || 600, 1200, 900)} className="tool-btn" title="Fit to Screen">
            <Maximize2 size={13} />
          </button>
          <span className="w-px h-3.5 bg-border mx-0.5" />
          <button
            onClick={() => setConfig((prev: CanvasConfig) => ({ ...prev, showGrid: !prev.showGrid, snapToGrid: !prev.snapToGrid }))}
            className={cn('tool-btn', config.snapToGrid && 'text-accent')}
            title={config.snapToGrid ? 'Snap to Grid: ON' : 'Snap to Grid: OFF'}
          >
            <Grid3x3 size={13} />
          </button>
          <button className="tool-btn text-muted/50 cursor-default" title="Pan (Shift+Click or Middle Click)">
            <Hand size={13} />
          </button>
        </div>
      )}

      {/* Zoom indicator (top toolbar) */}
      {toolbar === 'top' && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface/80 backdrop-blur-sm border border-border/50 rounded-lg px-2 py-1 text-[10px] font-mono text-muted">
          <span>{Math.round(config.zoom * 100)}%</span>
        </div>
      )}
    </div>
  );
}
