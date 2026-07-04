'use client';

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles, FileText, GitBranch, CalendarClock,
  Loader2, CheckCircle, AlertCircle,
} from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { buildAugmentedPrompt } from '@/lib/rag/retrieval';
import { streamLLM } from '@/lib/omni-client';
import { getCurrentModelId, isEngineLoaded, DEFAULT_MODEL_ID } from '@/lib/webllm-client';

interface Props {
  noteId: string;
}

interface StudioAction {
  id: 'summary' | 'timeline' | 'mindmap';
  label: string;
  description: string;
  icon: typeof Sparkles;
  prompt: string;
}

const STUDIO_ACTIONS: StudioAction[] = [
  {
    id: 'summary',
    label: 'Ringkasan Root Cause',
    description: 'Generate a structured root cause summary from your analysis',
    icon: FileText,
    prompt: `You are a root cause analysis expert. Based on the following analysis content and attached data, provide a structured root cause summary covering:
1. Primary root causes identified
2. Key contributing factors
3. Severity assessment
4. Recommended next steps

Format the response with clear sections.`,
  },
  {
    id: 'timeline',
    label: 'Generate Timeline',
    description: 'Create a mitigation timeline with milestones and deadlines',
    icon: CalendarClock,
    prompt: `You are a project planning expert. Based on the following analysis content and attached data, create a detailed mitigation timeline with:
1. Key milestones with realistic target dates
2. Dependencies between milestones
3. Critical path items
4. Resource requirements

Format as a structured timeline with dates.`,
  },
  {
    id: 'mindmap',
    label: 'Generate Graph (Mind Map)',
    description: 'Generate structured nodes for the mind map graph',
    icon: GitBranch,
    prompt: `You are a systems thinking expert. Based on the following analysis content and attached data, identify:
1. Root causes (fundamental issues)
2. Diagnoses (symptoms and contributing factors)
3. Impacts (consequences)
4. Mitigations (actionable solutions with deadlines)

Format the response as structured JSON that can be parsed.`,
  },
];

export default function StudioPanel({ noteId }: Props) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGenerate = useCallback(async (action: StudioAction) => {
    if (loading[action.id]) return;

    const modelId = getCurrentModelId() || DEFAULT_MODEL_ID;
    if (!isEngineLoaded(modelId)) {
      setErrors((prev) => ({ ...prev, [action.id]: 'Load a model first in AI Chat panel.' }));
      return;
    }

    setActiveAction(action.id);
    setLoading((prev) => ({ ...prev, [action.id]: true }));
    setErrors((prev) => ({ ...prev, [action.id]: '' }));
    setResults((prev) => ({ ...prev, [action.id]: '' }));

    const noteContent = note?.content;
    if (!noteContent?.trim()) {
      setErrors((prev) => ({
        ...prev,
        [action.id]: 'Write some analysis notes first.',
      }));
      setLoading((prev) => ({ ...prev, [action.id]: false }));
      return;
    }

    const safePrompt = action?.prompt || '';

    try {
      // Build augmented prompt with RAG context
      const { systemPrompt } = await buildAugmentedPrompt(
        noteId,
        noteContent,
        safePrompt,
      );

      let buffer = '';
      await streamLLM(
        noteContent,
        modelId,
        (chunk) => {
          buffer += chunk;
          setResults((prev) => ({ ...prev, [action.id]: buffer }));
        },
        new AbortController().signal,
        () => {},
        systemPrompt,
      );
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [action.id]: (err as Error).message,
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [action.id]: false }));
      setActiveAction(null);
    }
  }, [noteId, note?.content, loading]);

  // Check if note has content
  const hasContent = (note?.content?.trim()?.length ?? 0) > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={10} className="text-accent" />
          <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">Studio</span>
        </div>
        <p className="text-[9px] text-muted mt-0.5">Generate structured outputs from your analysis and data</p>
      </div>

      <div className="p-2 space-y-2">
        {STUDIO_ACTIONS.map((action) => {
          const isActive = activeAction === action.id;
          const isLoading = loading[action.id];
          const result = results[action.id];
          const error = errors[action.id];

          return (
            <div key={action.id}>
              <button onClick={() => handleGenerate(action)} disabled={isLoading || !hasContent}
                className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all border',
                  isActive ? 'bg-accent/10 border-accent/30 text-foreground' : 'bg-surface border-border hover:border-accent/20 text-foreground',
                  (isLoading || !hasContent) && 'opacity-50 cursor-not-allowed')}>
                <div className={cn('p-1.5 rounded-lg shrink-0', isActive ? 'bg-accent/20' : 'bg-surface2')}>
                  {isLoading ? <Loader2 size={12} className="animate-spin text-accent" /> : <action.icon size={12} className={isActive ? 'text-accent' : 'text-muted'} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium block">{action.label}</span>
                  <span className="text-[9px] text-muted mt-0.5 block">{action.description}</span>
                </div>
                {result && !isLoading && <CheckCircle size={10} className="text-success shrink-0 mt-1" />}
              </button>

              {/* Result panel */}
              {(result || error) && (
                <div className={cn('mt-1.5 p-2 rounded-lg border text-[10px] leading-relaxed',
                  error ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-surface2 border-border text-foreground')}>
                  {error ? (
                    <div className="flex items-start gap-1.5"><AlertCircle size={10} className="mt-0.5 shrink-0" /><span>{error}</span></div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto">{result}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!hasContent && (
        <div className="px-2 py-4 text-center"><p className="text-[10px] text-muted">Write analysis notes first to enable Studio generation.</p></div>
      )}

      <div className="mt-auto px-3 py-2 border-t border-border shrink-0">
        <div className="flex items-center gap-1 text-[9px] text-muted">
          <Sparkles size={8} className="text-accent" />
          <span>Powered by WebLLM + RAG</span>
        </div>
      </div>
    </div>
  );
}
