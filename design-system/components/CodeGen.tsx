'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Code, Eye, Copy, Check, Loader2, FileCode, Smartphone, Monitor, Sparkles } from 'lucide-react';
import Button from './Button';
import Tabs from './Tabs';

// ─── Code Generator ─────────────────────────────────────────────────────

export interface CodeGenProps {
  noteContent: string;
  className?: string;
  onGenerate?: (code: string, language: string) => void;
}

type Language = 'tsx' | 'html' | 'css' | 'json';
type ViewMode = 'preview' | 'code';

export default function CodeGen({ noteContent, className, onGenerate }: CodeGenProps) {
  const [language, setLanguage] = useState<Language>('tsx');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Generate Code from Notes ──
  const generateCode = useCallback(() => {
    if (!noteContent.trim()) return;
    setIsGenerating(true);

    // Simulate code generation (in production, this would use AI or a parser)
    setTimeout(() => {
      let code = '';

      if (language === 'tsx') {
        code = generateReactComponent(noteContent);
      } else if (language === 'html') {
        code = generateHTML(noteContent);
      } else if (language === 'css') {
        code = generateCSS(noteContent);
      } else if (language === 'json') {
        code = generateJSON(noteContent);
      }

      setGeneratedCode(code);
      setIsGenerating(false);
      onGenerate?.(code, language);

      // Update iframe preview
      if (iframeRef.current && (language === 'html' || language === 'tsx')) {
        const iframe = iframeRef.current;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          if (language === 'html') {
            doc.write(code);
          } else {
            doc.write(renderReactPreview(code));
          }
          doc.close();
        }
      }
    }, 500);
  }, [noteContent, language, onGenerate]);

  // Auto-generate when note content changes
  useEffect(() => {
    if (noteContent.trim()) {
      generateCode();
    }
  }, [noteContent, language]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCode]);

  const languageTabs = [
    { id: 'tsx', label: 'React TSX', icon: <FileCode size={11} /> },
    { id: 'html', label: 'HTML', icon: <Code size={11} /> },
    { id: 'css', label: 'CSS', icon: <Code size={11} /> },
    { id: 'json', label: 'JSON', icon: <Code size={11} /> },
  ];

  return (
    <div className={cn('flex flex-col border border-border rounded-xl overflow-hidden bg-surface animate-fade-in', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface2/50">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Code Gen</span>
        <div className="w-px h-3.5 bg-border mx-1" />
        <Tabs
          tabs={languageTabs}
          activeTab={language}
          onChange={(id) => setLanguage(id as Language)}
          variant="segmented"
          size="sm"
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode('preview')} className={cn('tool-btn', viewMode === 'preview' && 'text-accent')}>
            <Monitor size={12} />
          </button>
          <button onClick={() => setViewMode('code')} className={cn('tool-btn', viewMode === 'code' && 'text-accent')}>
            <Code size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[200px] max-h-[400px] overflow-auto">
        {viewMode === 'preview' && (language === 'html' || language === 'tsx') ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full min-h-[200px] bg-white"
            title="Code Preview"
            sandbox="allow-scripts"
          />
        ) : (
          <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-x-auto">
            <code className="text-foreground/80">{generatedCode || '// Generated code will appear here...'}</code>
          </pre>
        )}

        {/* Loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 size={14} className="animate-spin text-accent" />
              Generating {language.toUpperCase()}...
            </div>
          </div>
        )}

        {/* Empty state */}
        {!generatedCode && !isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
            <FileCode size={28} className="opacity-20 mb-2" />
            <p className="text-[11px]">Write notes to generate code</p>
            <p className="text-[9px] text-muted/60 mt-0.5">AI-powered design-to-code conversion</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {generatedCode && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface2/30">
          <span className="text-[9px] text-muted">
            {generatedCode.split('\n').length} lines · {generatedCode.length} chars
          </span>
          <button onClick={copyToClipboard} className="flex items-center gap-1 text-[9px] text-muted hover:text-foreground transition-colors">
            {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Code Generators ────────────────────────────────────────────────────

function generateReactComponent(content: string): string {
  // Parse note content into a React component
  const lines = content.split('\n').filter(Boolean);
  const title = lines[0]?.replace(/[#*_~`]/g, '').trim() || 'Component';
  const sanitized = title.replace(/[^a-zA-Z0-9]/g, '');
  const componentName = sanitized || 'GeneratedComponent';

  return `import React from 'react';
import { cn } from '@/lib/utils';

export interface ${componentName}Props {
  className?: string;
}

export default function ${componentName}({ className }: ${componentName}Props) {
  return (
    <div className={cn('p-6 rounded-xl bg-surface border border-border shadow-sm', className)}>
      <h2 className="text-lg font-bold text-foreground mb-2">
        ${title}
      </h2>
      <div className="prose prose-sm text-muted max-w-none">
        ${lines.slice(1).map(l => `<p>${l.replace(/[#*_~`>]/g, '').trim()}</p>`).join('\n        ')}
      </div>
    </div>
  );
}
`;
}

function generateHTML(content: string): string {
  const title = content.split('\n')[0]?.replace(/[#*_~`]/g, '').trim() || 'Document';
  const body = content.split('\n').slice(1).map(l => `<p>${l.replace(/[#*_~`>]/g, '').trim()}</p>`).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f0e8; color: #3a2a1a; line-height: 1.7; padding: 2rem; }
    .container { max-width: 720px; margin: 0 auto; background: #faf6ee; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #d4c9b8; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { margin-bottom: 0.75rem; color: #5a4a3a; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}

function generateCSS(content: string): string {
  const lines = content.split('\n').filter(Boolean);
  const components = lines.map((line, i) => {
    const clean = line.replace(/[#*_~`>]/g, '').trim();
    if (!clean) return '';
    const className = `.component-${i + 1}`;
    return `${className} {\n  /* ${clean} */\n  display: flex;\n  align-items: center;\n  padding: 0.75rem 1rem;\n  background: var(--surface);\n  border-radius: 12px;\n  border: 1px solid var(--border);\n  transition: all 0.2s ease;\n}\n\n${className}:hover {\n  background: var(--surface2);\n  transform: translateY(-1px);\n}\n`;
  }).join('\n');

  return `/* Generated from Swacana Notes */\n:root {\n  --bg: #f5f0e8;\n  --fg: #3a2a1a;\n  --surface: #faf6ee;\n  --surface2: #f0e8d8;\n  --border: #d4c9b8;\n  --accent: #c97b5e;\n  --muted: #8a7a6a;\n}\n\n${components}`;
}

function generateJSON(content: string): string {
  const lines = content.split('\n').filter(Boolean);
  const items = lines.map((line, i) => {
    const clean = line.replace(/[#*_~`>]/g, '').trim();
    return { id: i + 1, text: clean, tags: [], priority: 'medium' };
  });

  return JSON.stringify({
    title: lines[0]?.replace(/[#*_~`]/g, '').trim() || 'Untitled',
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    items,
    metadata: {
      source: 'Swacana Design-to-Code Engine',
      version: '1.0.0',
    },
  }, null, 2);
}

function renderReactPreview(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script></head>
<body><div id="root"></div>
<script type="text/babel">
${code}
ReactDOM.createRoot(document.getElementById('root')).render(<GeneratedComponent />);
</script></body></html>`;
}
