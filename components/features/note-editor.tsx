'use client';

import { useState, useCallback } from 'react';
import { Edit3, FileSearch, Database, Sparkles, Check, X } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface AIAction {
  icon: typeof Edit3;
  label: string;
  action: 'edit' | 'review' | 'scrap';
  description: string;
}

const AI_ACTIONS: AIAction[] = [
  {
    icon: Edit3,
    label: 'Edit',
    action: 'edit',
    description: 'AI-powered editing & rewriting',
  },
  {
    icon: FileSearch,
    label: 'Review',
    action: 'review',
    description: 'AI review & feedback',
  },
  {
    icon: Database,
    label: 'Scrap Data',
    action: 'scrap',
    description: 'Extract & analyze data from text',
  },
];

interface Props {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export default function NoteEditor({ initialContent = '', onContentChange }: Props) {
  const [content, setContent] = useState(initialContent);
  const [activeAction, setActiveAction] = useState<'edit' | 'review' | 'scrap' | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      onContentChange?.(e.target.value);
    },
    [onContentChange],
  );

  const handleAIAction = useCallback(
    async (action: 'edit' | 'review' | 'scrap') => {
      setActiveAction(action);
      setIsProcessing(true);
      setAiResult(null);

      // Clear any previous timer
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Simulate AI processing (in real app, would call the LLM)
      const placeholders = {
        edit: 'AI will help improve your writing style, grammar, and clarity...\n\nSelected text improvements will appear here.',
        review: 'AI will analyze your content for:\n• Grammar & spelling\n• Clarity & structure\n• Completeness & accuracy\n\nClick "Apply" to accept suggestions.',
        scrap: 'AI will extract structured data from your note:\n• Key entities & terms\n• Dates & deadlines\n• Action items & decisions\n• References & sources',
      };

      timeoutRef.current = setTimeout(() => {
        setAiResult(placeholders[action]);
        setIsProcessing(false);
      }, 800);
    },
    [],
  );

  const dismissResult = () => {
    setActiveAction(null);
    setAiResult(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* AI Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-700 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mr-2">
          AI Tools
        </span>
        {AI_ACTIONS.map((action) => (
          <button
            key={action.action}
            onClick={() => handleAIAction(action.action)}
            disabled={isProcessing}
            className={cn(
              'flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors',
              activeAction === action.action
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700',
              isProcessing && 'opacity-50 cursor-not-allowed',
            )}
            title={action.description}
          >
            <action.icon size={12} />
            {action.label}
          </button>
        ))}
        {activeAction && (
          <button
            onClick={dismissResult}
            className="ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Editor / AI Result Area */}
      <div className="flex-1 min-h-0 flex">
        {/* Main editor */}
        <div className={cn('flex-1 flex flex-col min-h-0', aiResult && 'border-r border-slate-700')}>
          <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider shrink-0">
            Notes
          </div>
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Write your analysis, thoughts, or paste text here... The AI tools above can help edit, review, and extract data from your notes."
            className="flex-1 bg-transparent text-slate-100 text-xs leading-relaxed px-2 py-1 resize-none focus:outline-none placeholder:text-slate-600 font-mono"
          />
        </div>

        {/* AI Result Panel */}
        {aiResult && (
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="px-2 py-1 text-[10px] text-indigo-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={10} />
              {activeAction === 'edit' && 'AI Edit'}
              {activeAction === 'review' && 'AI Review'}
              {activeAction === 'scrap' && 'AI Scrap'}
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Sparkles size={12} className="animate-pulse text-indigo-400" />
                  Processing...
                </div>
              ) : (
                <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {aiResult}
                </pre>
              )}
            </div>
            {!isProcessing && (
              <div className="px-2 py-1 border-t border-slate-700 flex gap-2 shrink-0">
                <button className="flex items-center gap-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors">
                  <Check size={10} />
                  Apply
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
