'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Edit3, FileSearch, Database, Sparkles, Check, X, Save, Maximize2, Minimize2, BookOpen, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { streamLLM } from '@/lib/omni-client';
import { isEngineLoaded, getCurrentModelId, DEFAULT_MODEL_ID } from '@/lib/webllm-client';
import { buildAugmentedPrompt } from '@/lib/rag/retrieval';

interface AIAction {
  icon: typeof Edit3;
  label: string;
  action: 'edit' | 'review' | 'scrap';
  description: string;
}

const AI_ACTIONS: AIAction[] = [
  { icon: Edit3, label: 'Edit', action: 'edit', description: 'Perbaiki tata bahasa & struktur' },
  { icon: FileSearch, label: 'Review', action: 'review', description: 'Review & feedback otomatis' },
  { icon: Database, label: 'Scrap', action: 'scrap', description: 'Ekstrak data terstruktur' },
];

const ACTION_PROMPTS: Record<string, string> = {
  edit: `You are an expert editor. Improve the following text by fixing grammar, spelling, clarity, and structure. Preserve the original meaning and tone. Return ONLY the improved text without any explanation or commentary.`,
  review: `You are an expert reviewer. Analyze the following text and provide structured feedback covering:\n1. Grammar & Spelling issues found\n2. Clarity & Structure rating\n3. Completeness & accuracy notes\n4. Specific suggestions for improvement\n\nFormat your response in clear sections.`,
  scrap: `You are a data extraction specialist. Extract and organize structured information from the following text. Identify:\n- Key entities & terms\n- Dates & deadlines mentioned\n- Action items & decisions\n- References & sources cited\n- Main topics & themes\n\nPresent the extracted data in a clean, structured format using bullet points and sections.`,
};

interface Props {
  noteId: string;
  initialContent?: string;
}

export default function NoteEditor({ noteId, initialContent = '' }: Props) {
  const [content, setContent] = useState(initialContent);
  const [activeAction, setActiveAction] = useState<'edit' | 'review' | 'scrap' | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  const saveToDb = useCallback(async (text: string) => {
    setIsSaving(true);
    try {
      await db.notes.update(noteId, { content: text, updatedAt: new Date().toISOString() });
      setLastSaved(new Date());
    } catch (err) {
      console.error('[NoteEditor] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [noteId]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToDb(text), 800);
  }, [saveToDb]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (contentRef.current) saveToDb(contentRef.current);
    };
  }, [saveToDb]);

  const handleAIAction = useCallback(async (action: 'edit' | 'review' | 'scrap') => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActiveAction(action);
    setIsProcessing(true);
    setAiResult(null);
    setAiError(null);

    const currentContent = contentRef.current;
    if (!currentContent.trim()) {
      setAiError('Belum ada konten. Tulis catatan terlebih dahulu.');
      setIsProcessing(false);
      return;
    }

    const modelId = getCurrentModelId() || DEFAULT_MODEL_ID;
    if (!isEngineLoaded(modelId)) {
      setAiError('Model AI belum di-load. Muat model di panel AI Chat terlebih dahulu.');
      setIsProcessing(false);
      return;
    }

    try {
      const { systemPrompt } = await buildAugmentedPrompt(noteId, currentContent, ACTION_PROMPTS[action]);
      let resultBuffer = '';
      await streamLLM(currentContent, modelId, (chunk) => {
        resultBuffer += chunk;
        setAiResult(resultBuffer);
      }, controller.signal, () => {}, systemPrompt);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setAiError(`AI gagal: ${(err as Error).message}`);
      }
    } finally {
      if (!controller.signal.aborted) setIsProcessing(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    if (!aiResult) return;
    if (activeAction === 'edit') {
      setContent(aiResult);
      saveToDb(aiResult);
    } else {
      const updated = contentRef.current + '\n\n--- AI Analysis ---\n\n' + aiResult;
      setContent(updated);
      saveToDb(updated);
    }
    setActiveAction(null);
    setAiResult(null);
  }, [aiResult, activeAction, saveToDb]);

  const dismissResult = () => {
    abortRef.current?.abort();
    setActiveAction(null);
    setAiResult(null);
    setAiError(null);
  };

  const [secondsSinceSave, setSecondsSinceSave] = useState(0);
  const lastSavedRef = useRef<Date | null>(null);

  useEffect(() => {
    lastSavedRef.current = lastSaved;
    setSecondsSinceSave(lastSaved ? Math.floor((Date.now() - lastSaved.getTime()) / 1000) : 0);
  }, [lastSaved]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSavedRef.current) {
        const secs = Math.floor((Date.now() - lastSavedRef.current.getTime()) / 1000);
        setSecondsSinceSave(secs);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex flex-col h-full transition-all', expanded && 'fixed inset-0 z-50 bg-surface')}>
      {/* ── Tool Bar ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border shrink-0 bg-surface/50">
        <BookOpen size={12} className="text-accent/60" />
        <span className="text-[9px] uppercase tracking-widest text-muted font-semibold mr-2">Catatan</span>

        <span className="w-px h-3 bg-border mx-0.5" />

        {/* AI Quick Actions */}
        {AI_ACTIONS.map((action) => (
          <button key={action.action} onClick={() => handleAIAction(action.action)} disabled={isProcessing}
            className={cn(
              'tool-btn text-[10px] gap-1 px-2',
              activeAction === action.action && 'bg-accent/12 text-accent',
              isProcessing && 'opacity-50 cursor-not-allowed',
            )}
            title={action.description}>
            <action.icon size={11} />
            {action.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {isSaving ? (
            <span className="flex items-center gap-1 text-[9px] text-muted">
              <Save size={9} className="animate-pulse" />
              Menyimpan...
            </span>
          ) : lastSaved ? (
            <span className="text-[9px] text-muted/60">
              Tersimpan {secondsSinceSave < 5 ? 'baru saja' : `${secondsSinceSave}s`}
            </span>
          ) : null}

          <button onClick={() => setExpanded(!expanded)}
            className="tool-btn" title={expanded ? 'Kecilkan' : 'Perbesar'}>
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          {activeAction && (
            <button onClick={dismissResult} className="tool-btn hover:!text-danger" title="Tutup">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 flex">
        <div className={cn('flex-1 flex flex-col min-h-0', aiResult && 'border-r border-border/50')}>
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Tulis catatan, diary, curhatan, atau tujuanmu di sini...
AI akan otomatis membantu memetakan solusi dan plan.

✨ Tips: Makin detail tulisanmu, makin baik insight yang dihasilkan."
            className="flex-1 bg-transparent text-foreground text-sm leading-relaxed px-5 py-4 resize-none focus:outline-none placeholder:text-muted/30 note-scroll"
          />
        </div>

        {/* AI Result Panel */}
        {(aiResult || aiError) && (
          <div className="w-1/2 flex flex-col min-h-0 bg-surface2/30">
            <div className="px-4 py-2 border-b border-border/50 shrink-0 flex items-center gap-1.5">
              <Sparkles size={10} className="text-accent" />
              <span className="text-[9px] uppercase tracking-wider text-accent font-semibold">
                {activeAction === 'edit' && 'AI Edit'}
                {activeAction === 'review' && 'AI Review'}
                {activeAction === 'scrap' && 'AI Ekstrak'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 note-scroll">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-muted text-xs">
                  <Sparkles size={12} className="animate-pulse text-accent" /> Memproses...
                </div>
              ) : aiError ? (
                <div className="flex items-start gap-2 text-danger text-xs px-3 py-2 rounded-xl bg-danger/10">
                  <span>⚠️</span>
                  <span>{aiError}</span>
                </div>
              ) : (
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{aiResult}</pre>
              )}
            </div>
            {!isProcessing && aiResult && !aiError && (
              <div className="px-4 py-2 border-t border-border/50 flex gap-2 shrink-0">
                <button onClick={handleApply} className="clay-btn clay-btn-sm flex items-center gap-1.5">
                  <Check size={10} /> Terapkan
                </button>
                <button onClick={dismissResult} className="px-3 py-1.5 text-[10px] rounded-xl bg-surface2 text-muted hover:text-foreground border border-border transition-all">
                  <X size={10} className="inline mr-1" /> Batal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
