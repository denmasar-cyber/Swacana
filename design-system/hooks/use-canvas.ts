'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface CanvasConfig {
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  minZoom: number;
  maxZoom: number;
}

export function useCanvas(initialConfig?: Partial<CanvasConfig>) {
  const [config, setConfig] = useState<CanvasConfig>({
    zoom: 1,
    panX: 0,
    panY: 0,
    gridSize: 24,
    snapToGrid: true,
    showGrid: true,
    minZoom: 0.1,
    maxZoom: 5,
    ...initialConfig,
  });

  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // ── Zoom ──
  const zoomIn = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      zoom: Math.min(prev.maxZoom, prev.zoom * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      zoom: Math.max(prev.minZoom, prev.zoom / 1.2),
    }));
  }, []);

  const zoomTo = useCallback((z: number) => {
    setConfig((prev) => ({
      ...prev,
      zoom: Math.max(prev.minZoom, Math.min(prev.maxZoom, z)),
    }));
  }, []);

  const zoomToFit = useCallback((containerWidth: number, containerHeight: number, contentWidth: number, contentHeight: number, padding = 0.8) => {
    const scaleX = (containerWidth * padding) / contentWidth;
    const scaleY = (containerHeight * padding) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 2);
    setConfig((prev) => ({
      ...prev,
      zoom: Math.max(prev.minZoom, Math.min(prev.maxZoom, newZoom)),
      panX: (containerWidth - contentWidth * newZoom) / 2,
      panY: (containerHeight - contentHeight * newZoom) / 2,
    }));
  }, []);

  // ── Pan ──
  const startPan = useCallback((x: number, y: number) => {
    isPanning.current = true;
    lastPos.current = { x, y };
  }, []);

  const movePan = useCallback((x: number, y: number) => {
    if (!isPanning.current) return;
    const dx = (x - lastPos.current.x) / config.zoom;
    const dy = (y - lastPos.current.y) / config.zoom;
    lastPos.current = { x, y };
    setConfig((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, [config.zoom]);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Snap to Grid ──
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!config.snapToGrid) return { x, y };
    const g = config.gridSize;
    return {
      x: Math.round(x / g) * g,
      y: Math.round(y / g) * g,
    };
  }, [config.snapToGrid, config.gridSize]);

  // ── Screen to Canvas coordinates ──
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - config.panX * config.zoom) / config.zoom,
      y: (screenY - config.panY * config.zoom) / config.zoom,
    };
  }, [config.zoom, config.panX, config.panY]);

  // ── Canvas to Screen coordinates ──
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * config.zoom + config.panX * config.zoom,
      y: canvasY * config.zoom + config.panY * config.zoom,
    };
  }, [config.zoom, config.panX, config.panY]);

  // ── Wheel zoom handler ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setConfig((prev) => ({
        ...prev,
        zoom: Math.max(prev.minZoom, Math.min(prev.maxZoom, prev.zoom * (1 + delta))),
      }));
    }
  }, []);

  // ── Mouse pan handler ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || e.altKey))) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
    }
  }, [startPan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    movePan(e.clientX, e.clientY);
  }, [movePan]);

  const handleMouseUp = useCallback(() => {
    endPan();
  }, [endPan]);

  // Global mouse up
  useEffect(() => {
    const handleUp = () => endPan();
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [endPan]);

  // Prevent default for wheel with ctrl
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    document.addEventListener('wheel', preventZoom, { passive: false });
    return () => document.removeEventListener('wheel', preventZoom);
  }, []);

  return {
    config,
    setConfig,
    zoomIn,
    zoomOut,
    zoomTo,
    zoomToFit,
    snapToGrid,
    screenToCanvas,
    canvasToScreen,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isPanning,
  };
}
