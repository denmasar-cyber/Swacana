'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, CheckSquare, Square, CalendarClock,
  Settings, Plus, StopCircle, Send, Sparkles,
  Menu, Brain, BookOpen, X, MessageSquare, GitBranch, Globe,
  Search, Trash2, MoreHorizontal,
} from 'lucide-react';

import { db, type Citation, type ChatMessage } from '@/lib/db';
import { streamLLM } from '@/lib/omni-client';
import type { LoadProgress } from '@/lib/webllm-client';
import { getCurrentModelId, isEngineLoaded, DEFAULT_MODEL_ID } from '@/lib/webllm-client';
import { buildAugmentedPrompt } from '@/lib/rag/retrieval';
import { cn } from '@/lib/utils';
import { autoLoadRequiredModels } from '@/lib/ai-requirements';

import KiroCanvasWorkspace from '@/components/features/kiro-canvas-workspace';
import NoteEditor from '@/components/features/note-editor';
import SourcesPanel from '@/components/features/sources-panel';
import StudioPanel from '@/components/features/studio-panel';
import ModelManager from '@/components/features/model-manager';
import CollaborationBar from '@/components/features/collaboration-bar';
import CommandPalette, { useCommandPalette } from '@/components/features/command-palette';

type PanelTab = 'chat' | 'sources' | 'models' | 'studio' | 'mindmap';

interface Props {
  noteId: string;
}

export default function NoteWorkspace({ noteId }: Props) {
  const router = useRouter();
  const { isOpen: cmdPaletteOpen, close: closeCmdPalette } = useCommandPalette();

  // ── State ──
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [activePanel, setActivePanel] = useState<PanelTab>('chat');
  const [rightPanel, setRightPanel] = useState<'mindmap' | 'none'>('mindmap');
  const [showMitigations, setShowMitigations] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatMode, setChatMode] = useState<'default' | 'analitis' | 'ringkas' | 'custom'>('default');
  const [showChatConfig, setShowChatConfig] = useState(false);

  // ── Live Queries ──
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const nodes = useLiveQuery(() => db.nodes.where('noteId').equals(noteId).toArray(), [noteId], []);
  const datasets = useLiveQuery(() => db.datasets.where('noteId').equals(noteId).toArray(), [noteId], []);

  // ── Auto-load models ──
  useEffect(() => { autoLoadRequiredModels(); }, []);

  // ── Chat Mode Prompts ──
  const CHAT_MODE_PROMPTS: Record<string, string> = {
    default: `You are a helpful, balanced, and neutral AI assistant for analysis. Be conversational, human, and warm. Use the attached data context if provided and relevant.`,
    analitis: `You are a cold, scientific, and analytical AI mediator. Analyze user input objectively. Focus on root causes, data-driven insights, and structured reasoning. Cite sources using [number] notation.`,
    ringkas: `You are a concise AI assistant. Provide brief, to-the-point answers. Use bullet points when possible. Be direct. Cite sources using [number] notation.`,
    custom: '',
  };

  // ── Chat ──
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isStreaming) return;

    await db.chatMessages.add({
      id: crypto.randomUUID(), noteId, role: 'user', content: text, createdAt: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), noteId, role: 'user', content: text, createdAt: new Date().toISOString() }]);
    setChatInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, noteId, role: 'assistant', content: '', createdAt: new Date().toISOString() }]);

    try {
      const basePrompt = CHAT_MODE_PROMPTS[chatMode] || CHAT_MODE_PROMPTS.default;
      const { systemPrompt, citations } = await buildAugmentedPrompt(noteId, text, basePrompt);
      let buffer = '';

      await streamLLM(text, selectedModelId, (chunk) => {
        buffer += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: last.content + chunk };
          return updated;
        });
      }, controller.signal, (p) => setLoadProgress(p), systemPrompt);

      await db.chatMessages.add({
        id: assistantId, noteId, role: 'assistant', content: buffer,
        citations: citations.length > 0 ? citations : undefined, createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: `⚠️ Error: ${(err as Error).message}` };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      setLoadProgress(null);
      abortRef.current = null;
    }
  }, [chatInput, isStreaming, noteId, selectedModelId, chatMode]);

  const handleStopChat = useCallback(() => abortRef.current?.abort(), []);

  // ── Load messages ──
  useEffect(() => {
    const load = async () => {
      const saved = await db.chatMessages.where('noteId').equals(noteId).sortBy('createdAt');
      setMessages(saved);
    };
    load();
  }, [noteId]);

  // ── Title ──
  const saveTitle = async () => {
    if (!note) return;
    await db.notes.update(noteId, { title: titleDraft, updatedAt: new Date().toISOString() });
    setEditingTitle(false);
  };

  // ── Toggle done ──
  const handleToggleDone = useCallback(async (id: string) => {
    const node = await db.nodes.get(id);
    if (!node) return;
    await db.nodes.update(id, { status: node.status === 'DONE' ? 'PENDING' : 'DONE' });
  }, []);

  // ── Loading ──
  if (!note) {
    return (
      <div className="min-h-screen bg-background text-muted flex items-center justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Memuat...
        </div>
      </div>
    );
  }

  const mitigationNodes = (nodes ?? []).filter((n) => n.nodeType === 'MITIGATION');
  const activeDatasetCount = (datasets ?? []).filter((d) => d.isEnabled && d.status === 'READY').length;

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden vintage-paper">
      <CommandPalette isOpen={cmdPaletteOpen} onClose={closeCmdPalette} />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface/70 backdrop-blur-sm shrink-0">
          <button onClick={() => router.push('/')}
            className="p-1.5 rounded-xl hover:bg-surface2 text-muted hover:text-foreground transition-all">
            <ArrowLeft size={15} />
          </button>

          {/* Title */}
          {editingTitle ? (
            <input autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle} onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              className="clay-input text-sm font-semibold w-64 py-1.5 px-3" />
          ) : (
            <button onClick={() => { setTitleDraft(note.title); setEditingTitle(true); }}
              className="flex items-center gap-2 text-sm font-bold hover:text-accent transition-colors group">
              {note.title}
              <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted" />
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {/* Quick Actions */}
            <div className="tool-bar">
              {([{ key: 'chat', icon: MessageSquare, label: 'AI Chat' },
                { key: 'sources', icon: BookOpen, label: 'Sumber' },
                { key: 'models', icon: Brain, label: 'Model' },
                { key: 'studio', icon: Sparkles, label: 'Studio' },
                { key: 'mindmap', icon: GitBranch, label: 'Mind Map' },
              ] as const).map((p) => (
                <button key={p.key} onClick={() => setActivePanel(p.key)}
                  className={cn('tool-btn', activePanel === p.key && 'bg-accent/12 text-accent')}
                  title={p.label}>
                  <p.icon size={14} />
                </button>
              ))}
              <span className="w-px h-4 bg-border mx-0.5" />
              <button onClick={() => {
                if (rightPanel === 'mindmap') {
                  setRightPanel('none');
                } else {
                  setRightPanel('mindmap');
                  setActivePanel('mindmap');
                }
              }}
                className={cn('tool-btn', rightPanel === 'mindmap' && 'bg-accent/12 text-accent')}
                title="Mind Map">
                <GitBranch size={14} />
              </button>
            </div>

            {activeDatasetCount > 0 && (
              <span className="clay-badge text-[9px]">
                <Globe size={8} />
                RAG: {activeDatasetCount}
              </span>
            )}
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* LEFT: Note Editor */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <NoteEditor key={noteId} noteId={noteId} initialContent={note.content} />
            </div>
          </div>

          {/* RIGHT: Panels (collapsible) */}
          {rightPanel === 'mindmap' && (
            <div className="w-96 flex flex-col border-l border-border shrink-0 bg-surface/30 overflow-hidden">
              {activePanel === 'chat' && (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2 min-h-0 note-scroll">
                    {messages.length === 0 ? (
                      <div className="text-muted text-[11px] text-center mt-6 px-4 leading-relaxed">
                        <MessageSquare size={18} className="mx-auto mb-2 opacity-30" />
                        <p>Deskripsikan situasi atau masalahmu. AI akan membantu memetakan solusi.</p>
                        {activeDatasetCount > 0 && (
                          <p className="text-[10px] text-success mt-2">✦ RAG aktif</p>
                        )}
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={cn('flex flex-col gap-0.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                          <div className={cn('max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed animate-fade-in',
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-accent to-accent2 text-white rounded-br-sm'
                              : 'bg-surface text-foreground border border-border rounded-bl-sm')}>
                            {msg.content || (isStreaming ? '⋯' : '')}
                            {msg.citations && msg.citations.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 ml-1">
                                {msg.citations.map((c) => (
                                  <span key={c.index} className="text-[8px] px-1 py-0.5 rounded-full bg-accent/10 text-accent">{c.index}</span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="px-3 py-2 border-t border-border/50 shrink-0">
                    <div className="clay-input flex items-center gap-1 !py-1.5 !px-2">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                        placeholder="Tulis pesan untuk AI…" className="flex-1 text-xs px-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted/60" disabled={isStreaming} />
                      {isStreaming ? (
                        <button onClick={handleStopChat}
                          className="p-1 rounded-lg hover:bg-danger/20 text-danger transition-all shrink-0">
                          <StopCircle size={15} />
                        </button>
                      ) : (
                        <button onClick={handleSendChat} disabled={!chatInput.trim()}
                          className="p-1 rounded-lg hover:bg-accent/20 text-accent disabled:text-muted/30 disabled:hover:bg-transparent transition-all shrink-0">
                          <Send size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activePanel === 'sources' && <SourcesPanel noteId={noteId} />}
              {activePanel === 'models' && (
                <ModelManager selectedModelId={selectedModelId} onModelChange={setSelectedModelId} onLoadProgress={setLoadProgress} />
              )}
              {activePanel === 'studio' && <StudioPanel noteId={noteId} />}

              {/* Mind Map tab — full height with scrollable canvas */}
              {activePanel === 'mindmap' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-1.5">
                    <GitBranch size={12} className="text-accent" />
                    <span className="text-[10px] font-semibold text-accent">Mind Map</span>
                    <span className="text-[9px] text-muted ml-auto">{nodes?.length ?? 0} node</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto note-scroll">
                    <KiroCanvasWorkspace nodes={nodes ?? []} onToggleDone={handleToggleDone} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No right panel - just editor */}
          {rightPanel === 'none' && null}
        </div>

        {/* ── Mitigation Bar ── */}
        {showMitigations && mitigationNodes.length > 0 && (
          <div className="h-11 shrink-0 border-t border-border bg-surface/70 flex">
            <button onClick={() => setShowMitigations(false)}
              className="w-6 shrink-0 flex items-center justify-center border-r border-border hover:bg-surface2 transition-colors text-muted hover:text-foreground">
              <X size={10} />
            </button>
            <div className="flex-1 flex items-center gap-2 px-3 overflow-x-auto note-scroll">
              <CalendarClock size={11} className="text-warning shrink-0" />
              <span className="text-[9px] text-muted font-medium shrink-0">Tenggat:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {mitigationNodes.slice(0, 10).map((node) => {
                  const isDone = node.status === 'DONE';
                  const isOverdue = !isDone && node.targetDate! < new Date().toISOString().split('T')[0];
                  return (
                    <button key={node.id} onClick={() => handleToggleDone(node.id)}
                      className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-[8px] whitespace-nowrap transition-all clay-badge',
                        isDone ? '!bg-success/15 !text-success !border-success/20' :
                        isOverdue ? '!bg-danger/15 !text-danger !border-danger/20' :
                        '!bg-surface2 !text-foreground !border-border')}>
                      {isDone ? <CheckSquare size={7} /> : <Square size={7} />}
                      <span className="truncate max-w-[70px]">{node.label}</span>
                      {node.targetDate && <span className={cn('font-mono', isDone ? 'opacity-60' : isOverdue ? 'text-danger' : 'text-muted')}>{node.targetDate}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
