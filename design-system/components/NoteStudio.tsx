'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles, FileCode, Layout, Database, BookOpen,
  PenSquare, Share2, MessageSquare, PanelRightOpen,
} from 'lucide-react';
import { Tabs, Button, Card, Badge } from './index';
import CodeGen from './CodeGen';
import Canvas from './Canvas';
import CMSDashboard from './CMSDashboard';
import { AnimateIn } from './Motion';
import type { Tab } from './Tabs';
import type { FormSchema } from './FormBuilder';

export interface NoteStudioProps {
  noteId?: string;
  noteContent?: string;
  noteTitle?: string;
  onNoteUpdate?: (content: string) => void;
  className?: string;
}

export default function NoteStudio({ noteId, noteContent = '', noteTitle = '', onNoteUpdate, className }: NoteStudioProps) {
  const [activeModule, setActiveModule] = useState<'canvas' | 'codegen' | 'cms' | 'note'>('canvas');
  const [showStudio, setShowStudio] = useState(false);

  // ── Studio Modules ──
  const studioTabs: Tab[] = [
    { id: 'note', label: 'Note', icon: <BookOpen size={11} /> },
    { id: 'canvas', label: 'Canvas', icon: <Layout size={11} /> },
    { id: 'codegen', label: 'Code Gen', icon: <FileCode size={11} /> },
    { id: 'cms', label: 'CMS', icon: <Database size={11} /> },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'note':
        return (
          <div className="flex flex-col h-full">
            <div className="p-4 flex-1 min-h-0">
              <textarea
                value={noteContent}
                onChange={(e) => onNoteUpdate?.(e.target.value)}
                placeholder="Mulai menulis catatanmu di sini...
Catatan akan otomatis terhubung ke Canvas, Code Generator, dan CMS Builder."
                className="w-full h-full bg-transparent text-foreground text-sm leading-relaxed resize-none focus:outline-none placeholder:text-muted/30 note-scroll"
              />
            </div>
            <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-[9px] text-muted">
              <span>{noteContent.length} chars</span>
              <span className="w-px h-3 bg-border mx-0.5" />
              <span>{noteContent.split(/\s+/).filter(Boolean).length} words</span>
              <span className="ml-auto flex items-center gap-1">
                <MessageSquare size={9} />
                Connected to all modules
              </span>
            </div>
          </div>
        );

      case 'canvas':
        return (
          <Canvas
            config={{ showGrid: true, snapToGrid: true }}
            onCanvasClick={(x, y) => {
              // Place a new node from note content
              console.log(`Placing node at ${x}, ${y}`);
            }}
          >
            {noteContent && (
              <div
                className="clay-card p-4 max-w-[280px] cursor-pointer hover:scale-105 transition-transform"
                style={{ position: 'absolute', left: 100, top: 100 }}
                title="Drag to move"
              >
                <Badge size="sm" variant="primary" dot>From Notes</Badge>
                <p className="text-xs text-foreground mt-2 line-clamp-4">{noteContent}</p>
              </div>
            )}
          </Canvas>
        );

      case 'codegen':
        return (
          <div className="p-2 h-full overflow-y-auto">
            <CodeGen noteContent={noteContent} />
            <div className="mt-2 px-3 py-2 rounded-lg bg-surface2 border border-border text-[9px] text-muted flex items-center gap-2">
              <Sparkles size={10} className="text-accent" />
              Powered by AI — convert your notes to production-ready code
            </div>
          </div>
        );

      case 'cms':
        return (
          <div className="p-2 h-full overflow-y-auto">
            <CMSDashboard
              onSaveForm={(schema) => {
                console.log('[NoteStudio] Form saved:', schema.title);
              }}
              onSaveData={(data) => {
                console.log('[NoteStudio] Data saved:', data.length, 'records');
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toggle Studio Button */}
      {!showStudio && (
        <button onClick={() => setShowStudio(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors"
        >
          <PanelRightOpen size={12} />
          Open Studio
        </button>
      )}

      {showStudio && (
        <AnimateIn preset="slideLeft" className="flex flex-col h-full border-l border-border bg-surface/80 backdrop-blur-sm">
          {/* Studio Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface2/50">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-accent" />
              <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Studio</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-muted bg-surface2 px-1.5 py-0.5 rounded-full">v1.0</span>
              <button onClick={() => setShowStudio(false)}
                className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground transition-all">
                <PanelRightOpen size={12} className="rotate-180" />
              </button>
            </div>
          </div>

          {/* Module Tabs */}
          <Tabs
            tabs={studioTabs}
            activeTab={activeModule}
            onChange={(id) => setActiveModule(id as typeof activeModule)}
            variant="underline"
            size="sm"
            className="px-2 pt-1"
          />

          {/* Module Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderModule()}
          </div>

          {/* Connection Status */}
          <div className="px-3 py-1.5 border-t border-border flex items-center gap-1.5 text-[8px] text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            All modules connected to note
            {noteContent && <Badge size="sm" variant="success" dot>Active</Badge>}
          </div>
        </AnimateIn>
      )}
    </div>
  );
}
