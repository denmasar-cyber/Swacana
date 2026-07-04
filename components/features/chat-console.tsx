'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, StopCircle, ChevronDown, ChevronRight, Mic, MicOff } from 'lucide-react';
import ModelLoader from './model-loader';
import { DEFAULT_MODEL_ID, type LoadProgress } from '@/lib/webllm-client';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinkContent?: string;
}

interface Props {
  onStream: (
    userMessage: string,
    modelId: string,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
    onLoadProgress: (p: LoadProgress) => void,
  ) => Promise<void>;
}

export default function ChatConsole({ onStream }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkOpen, setThinkOpen] = useState<Record<number, boolean>>({});

  // Model state
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    scrollToBottom();

    const controller = new AbortController();
    abortRef.current = controller;

    let buffer = '';

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', thinkContent: '' },
    ]);

    try {
      await onStream(
        text,
        selectedModelId,
        (chunk) => {
          buffer += chunk;

          // Parse <think> content live
          const thinkMatch = buffer.match(/<think>([\s\S]*?)(<\/think>|$)/i);
          const thinkContent = thinkMatch ? thinkMatch[1] : '';
          const afterThink = buffer.includes('</think>')
            ? buffer.split('</think>').slice(1).join('</think>')
            : '';

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: afterThink, thinkContent };
            }
            return updated;
          });
          scrollToBottom();
        },
        controller.signal,
        (p) => setLoadProgress(p),
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: `⚠️ ${(err as Error).message}`,
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      setLoadProgress(null);
      abortRef.current = null;
    }
  }, [input, isStreaming, onStream, selectedModelId]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const toggleSpeech = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return alert('Speech recognition not supported in this browser.');

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  return (
    <div className="flex flex-col h-full">
      <ModelLoader
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        onProgress={setLoadProgress}
        loadProgress={loadProgress}
      />

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-muted text-xs text-center mt-8 px-4 leading-relaxed">
            Load a model above, then describe a problem or goal.
            The AI will map it as a decision tree on the right.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}>
            {msg.role === 'assistant' && msg.thinkContent && (
              <div className="w-full">
                <button
                  onClick={() => setThinkOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className="flex items-center gap-1 text-[10px] text-muted hover:text-foreground transition-colors"
                >
                  {thinkOpen[i] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>Reasoning trace</span>
                </button>
                {thinkOpen[i] && (
                  <pre className="mt-1 text-[10px] text-muted bg-surface2/60 rounded p-2 whitespace-pre-wrap font-mono overflow-x-auto max-h-40 overflow-y-auto">
                    {msg.thinkContent}
                  </pre>
                )}
              </div>
            )}
            <div
              className={cn(
                'max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-accent text-white'
                  : 'bg-surface2 text-foreground',
              )}
            >
              {msg.role === 'assistant'
                ? msg.content || (isStreaming ? '⋯' : '')
                : msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-border flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Describe your problem or situation… (Enter to send)"
          rows={2}
          className="flex-1 bg-surface2 text-foreground text-xs rounded px-2 py-1.5 border border-border focus:outline-none focus:border-accent resize-none"
          disabled={isStreaming}
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={toggleSpeech}
            title={isListening ? 'Stop listening' : 'Start voice input'}
            className={cn(
              'p-1.5 rounded transition-colors',
              isListening
                ? 'bg-danger text-white'
                : 'bg-surface3 text-muted hover:text-foreground',
            )}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          {isStreaming ? (
            <button
              onClick={handleStop}
              title="Stop AI stream"
              className="p-1.5 rounded bg-danger text-white hover:opacity-80 transition-colors"
            >
              <StopCircle size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send"
              className="p-1.5 rounded bg-accent text-white hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
