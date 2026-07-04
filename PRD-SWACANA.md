# PRD: Swacana — Redesain UI/UX & Fungsionalitas AI

## 1. Overview
**Nama Aplikasi:** Swacana  
**Stack:** Next.js 16 + Tailwind CSS v4 + TypeScript  
**Database:** IndexedDB (Dexie.js)  
**AI Engine:** WebLLM (MLC) + Ollama fallback  
**Inspirasi Desain:** NotebookLM + Google Gemini

---

## 2. Database Schema (Dexie/IndexedDB)

### Table: `notes`
| Field | Type | Keterangan |
|-------|------|------------|
| `id` | `string` | Primary key (UUID) |
| `title` | `string` | Judul analisis |
| `content` | `string` | Konten catatan |
| `createdAt` | `string` (ISO) | Waktu dibuat |
| `updatedAt` | `string` (ISO) | Waktu diupdate |

### Table: `nodes`
| Field | Type | Keterangan |
|-------|------|------------|
| `id` | `string` | Primary key (UUID) |
| `noteId` | `string` | Foreign key ke notes |
| `parentId` | `string \| null` | Parent node (untuk tree) |
| `nodeType` | `'ROOT_CAUSE' \| 'DIAGNOSIS' \| 'IMPACT' \| 'MITIGATION'` | Tipe node |
| `label` | `string` | Label pendek |
| `details` | `string` | Detail analisis |
| `targetDate` | `string \| null` | Target deadline (MITIGATION only) |
| `status` | `'PENDING' \| 'DONE'` | Status |

### Table: `reminders`
| Field | Type | Keterangan |
|-------|------|------------|
| `id` | `string` | Primary key |
| `nodeId` | `string` | Foreign key ke nodes |
| `noteId` | `string` | Foreign key ke notes |
| `title` | `string` | Judul reminder |
| `targetDate` | `string` | Tanggal deadline |
| `isAcknowledged` | `boolean` | Status acknowledged |

---

## 3. Event Handlers & Fungsi

### 3.1 Button: New Analysis
```typescript
onClick = async () => {
  const id = crypto.randomUUID();
  await db.notes.add({
    id, title: 'New Analysis', content: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  router.push(`/note/${id}`);
};
```

### 3.2 Button: Delete Analysis
```typescript
onClick = async (e: React.MouseEvent, id: string) => {
  e.stopPropagation();
  if (!confirm('Delete this analysis and all its nodes?')) return;
  await db.nodes.where('noteId').equals(id).delete();
  await db.notes.delete(id);
};
```

### 3.3 Button: AI Action (Edit / Review / Scrap Data)
```typescript
onClick = async (action: 'edit' | 'review' | 'scrap') => {
  // 1. Cancel previous request
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  // 2. Set processing state
  setActiveAction(action);
  setIsProcessing(true);
  setAiResult(null);
  setAiError(null);

  // 3. Validate: content exists
  if (!contentRef.current.trim()) {
    setAiError('No content to process. Write some notes first.');
    setIsProcessing(false);
    return;
  }

  // 4. Validate: AI model loaded
  const modelId = getCurrentModelId() || DEFAULT_MODEL_ID;
  if (!isEngineLoaded(modelId)) {
    setAiError('AI model not loaded. Load in AI Chat panel first.');
    setIsProcessing(false);
    return;
  }

  // 5. Stream AI response with custom system prompt
  try {
    let buffer = '';
    await streamLLM(
      contentRef.current,          // userMessage
      modelId,                     // model
      (chunk) => { buffer += chunk; setAiResult(buffer); },  // onChunk
      controller.signal,           // abort signal
      () => {},                    // onLoadProgress
      ACTION_PROMPTS[action]       // custom systemPrompt (not guardrail)
    );
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      setAiError(`AI failed: ${(err as Error).message}`);
    }
  } finally {
    if (!controller.signal.aborted) setIsProcessing(false);
  }
};
```

### 3.4 Button: Apply AI Result
```typescript
onClick = () => {
  if (!aiResult) return;
  if (activeAction === 'edit') {
    // Replace content entirely
    setContent(aiResult);
    saveToDb(aiResult);
  } else if (activeAction === 'review' || activeAction === 'scrap') {
    // Append AI analysis to existing content
    const updated = contentRef.current + '\n\n--- AI Analysis ---\n\n' + aiResult;
    setContent(updated);
    saveToDb(updated);
  }
  setActiveAction(null);
  setAiResult(null);
};
```

### 3.5 Button: Toggle Mitigation Done
```typescript
onClick = async (id: string) => {
  const node = await db.nodes.get(id);
  if (!node) return;
  await db.nodes.update(id, {
    status: node.status === 'DONE' ? 'PENDING' : 'DONE',
  });
};
```

### 3.6 Button: View Switcher (Dashboard)
```typescript
onClick = (key: 'graph' | 'timeline' | 'search') => {
  setView(key);
};
```

### 3.7 Button: Send Chat Message
```typescript
onClick = async () => {
  const text = input.trim();
  if (!text || isStreaming) return;
  
  setMessages(prev => [...prev, { role: 'user', content: text }]);
  setInput('');
  setIsStreaming(true);
  
  const controller = new AbortController();
  abortRef.current = controller;
  
  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
  
  await onStream(text, selectedModelId, (chunk) => {
    // Update last message with streaming content
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content: last.content + chunk };
      }
      return updated;
    });
  }, controller.signal, setLoadProgress);
};
```

### 3.8 Button: Load AI Model
```typescript
onClick = async () => {
  if (loaded || loading) return;
  setLoading(true);
  try {
    await getEngine(selectedModelId, (p) => onProgress(p));
    onProgress(null);
  } catch (err) {
    onProgress({ text: `Failed: ${(err as Error).message}`, progress: 0 });
  } finally {
    setLoading(false);
  }
};
```

---

## 4. API & Data Flow

### 4.1 AI Pipeline
```
User Input → streamLLM(userMessage, modelId, onChunk, signal, onProgress, systemPrompt?)
  ├── WebLLM (browser) → streamWebLLM(systemPrompt, userMessage, ...)
  │     └── @mlc-ai/web-llm → MLCEngine.chat.completions.create({stream: true})
  │
  └── Fallback → Ollama / Llama.cpp / LocalAI
        └── fetch(endpoint, {body, signal})
```

### 4.2 HuggingFace API (Data Explorer)
```
GET https://huggingface.co/api/datasets?sort=downloads&direction=-1&limit=25&search={query}
→ Returns HFDataset[]
→ Parse Link header for pagination
```

### 4.3 WebSocket (Collaboration)
```
ws://localhost:3001
Message types: join, leave, update, cursor, presence
Broadcast to room (noteId)
```

### 4.4 BroadcastChannel (Same-browser Sync)
```
Channel: 'swacana-sync'
Same message types as WebSocket
For same-browser cross-tab sync (free, no server needed)
```

---

## 5. Theme Token (Tailwind v4)

```css
/* globals.css */
:root {
  --background: #0a0a0f;
  --foreground: #e8e8ed;
  --accent: #8b5cf6;
  --accent2: #6366f1;
  --surface: #12121a;
  --surface2: #1a1a25;
  --border: #2a2a3a;
  --muted: #6b6b80;
}

/* Utility classes */
.glass { background: rgba(18,18,26,0.8); backdrop-filter: blur(12px); }
.gradient-text { background: linear-gradient(135deg, #8b5cf6, #6366f1, #06b6d4); -webkit-background-clip: text; }
.glow-purple { box-shadow: 0 0 20px rgba(139,92,246,0.15); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.card:hover { border-color: rgba(139,92,246,0.3); }
.btn-gemini { background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; border-radius: 8px; }
.btn-gemini:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(139,92,246,0.3); }

/* Animations */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
```

---

## 6. Available AI Models

| Model | Size | Use Case |
|-------|------|----------|
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | 0.7GB | Fast, testing |
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | 1.8GB | Balanced |
| `Phi-3.5-mini-instruct-q4f16_1-MLC` | 2.2GB | Smart reasoning |
| `gemma-2-2b-it-q4f16_1-MLC` | 1.5GB | Efficient |

---

## 7. Error States

| Skenario | Handling |
|----------|----------|
| DB kosong → Auto-seed demo data | `seedDemoData()` |
| Model AI belum di-load | Error: "Load model in AI Chat panel first" |
| Konten kosong untuk AI | Error: "Write some notes first" |
| WebLLM gagal | Fallback ke Ollama |
| Stream di-cancel | AbortController, cleanup state |
| Save DB gagal | console.error, UI tetap responsif |
