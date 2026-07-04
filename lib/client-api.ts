/**
 * SWACANA v2 — Server API Client (Thin Client)
 *
 * Replaces all IndexedDB/Dexie operations with server API calls.
 * The browser stores ZERO data — everything lives on the VPS.
 *
 * Authentication via JWT token or API key.
 */

// ─── Config ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Token Management ──────────────────────────────────────────────────────

let _token: string | null = null;

export function setAuthToken(token: string) {
  _token = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('swacana-token', token);
  }
}

export function getAuthToken(): string | null {
  if (_token) return _token;
  if (typeof window !== 'undefined') {
    _token = localStorage.getItem('swacana-token');
  }
  return _token;
}

export function clearAuthToken() {
  _token = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('swacana-token');
  }
}

// ─── Fetch Wrapper ──────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  json?: unknown;
}

async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { json, ...fetchOpts } = options;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(fetchOpts.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(json);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Streaming Fetch ────────────────────────────────────────────────────────

async function apiStream(
  path: string,
  json: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(json),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) onChunk(parsed.text);
          if (parsed.error) throw new Error(parsed.error);
        } catch (e) {
          if ((e as Error).message.includes('API error')) throw e;
        }
      }
    }
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  async register(email: string, password: string, displayName?: string) {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth', {
      method: 'POST',
      json: { action: 'register', email, password, displayName },
    });
    setAuthToken(res.token);
    return res;
  },

  async login(email: string, password: string) {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth', {
      method: 'POST',
      json: { action: 'login', email, password },
    });
    setAuthToken(res.token);
    return res;
  },

  async logout() {
    await apiFetch('/api/auth', { method: 'POST', json: { action: 'logout' } });
    clearAuthToken();
  },

  async me() {
    return apiFetch<{ user: User; apiKeys: ApiKey[] }>('/api/auth');
  },

  async createApiKey(label: string, scopes?: string[]) {
    return apiFetch<{ apiKey: string; label: string }>('/api/auth', {
      method: 'POST',
      json: { action: 'create-api-key', label, scopes },
    });
  },

  async deleteApiKey(id: string) {
    await apiFetch(`/api/auth?id=${id}`, { method: 'DELETE' });
  },
};

// ─── Notes ──────────────────────────────────────────────────────────────────

export interface NoteSummary {
  id: string;
  title: string;
  content: string;
  tags: string[];
  chatMode: string;
  nodeCount: number;
  chatCount: number;
  datasetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDetail extends NoteSummary {
  customPrompt: string | null;
  nodes: KiroNode[];
  reminders: Reminder[];
  datasets: DatasetInfo[];
}

export const notes = {
  async list(options?: { search?: string; tag?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.search) params.set('search', options.search);
    if (options?.tag) params.set('tag', options.tag);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    return apiFetch<{ notes: NoteSummary[]; total: number }>(`/api/v2/notes?${params}`);
  },

  async get(id: string) {
    return apiFetch<NoteDetail>(`/api/v2/notes/${id}`);
  },

  async create(data: { title?: string; content?: string; tags?: string[] }) {
    return apiFetch<NoteSummary>('/api/v2/notes', {
      method: 'POST',
      json: data,
    });
  },

  async update(id: string, data: { title?: string; content?: string; tags?: string[]; chatMode?: string }) {
    return apiFetch<NoteSummary>(`/api/v2/notes/${id}`, {
      method: 'PATCH',
      json: data,
    });
  },

  async delete(id: string) {
    await apiFetch(`/api/v2/notes/${id}`, { method: 'DELETE' });
  },
};

// ─── Nodes ──────────────────────────────────────────────────────────────────

export interface KiroNode {
  id: string;
  parentId: string | null;
  nodeType: 'ROOT_CAUSE' | 'DIAGNOSIS' | 'IMPACT' | 'MITIGATION';
  label: string;
  details: string;
  targetDate: string | null;
  status: 'PENDING' | 'DONE';
}

export const nodes = {
  async list(noteId: string) {
    return apiFetch<{ nodes: KiroNode[] }>(`/api/v2/notes/${noteId}/nodes`);
  },

  async create(noteId: string, data: {
    parentId?: string; nodeType: string; label: string; details?: string; targetDate?: string;
  }) {
    return apiFetch<{ node: KiroNode }>(`/api/v2/notes/${noteId}/nodes`, {
      method: 'POST',
      json: data,
    });
  },
};

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: unknown;
  createdAt: string;
}

export const chat = {
  async history(noteId: string) {
    return apiFetch<{ messages: ChatMessage[] }>(`/api/v2/notes/${noteId}/chat`);
  },

  async send(
    noteId: string,
    content: string,
    onChunk: (text: string) => void,
    options?: { model?: string; chatMode?: string; signal?: AbortSignal },
  ) {
    return apiStream(
      `/api/v2/notes/${noteId}/chat`,
      { content, model: options?.model, chatMode: options?.chatMode },
      onChunk,
      options?.signal,
    );
  },

  async clear(noteId: string) {
    await apiFetch(`/api/v2/notes/${noteId}/chat`, { method: 'DELETE' });
  },
};

// ─── AI ─────────────────────────────────────────────────────────────────────

export const ai = {
  async status() {
    return apiFetch<{ healthy: boolean; modelCount: number; models: { name: string; size: number }[] }>('/api/v2/ai?action=status');
  },

  async models() {
    return apiFetch<{ models: unknown[]; recommended: unknown[] }>('/api/v2/ai?action=models');
  },

  async generate(prompt: string, options?: { system?: string; model?: string }) {
    return apiFetch<{ text: string }>('/api/v2/ai', {
      method: 'POST',
      json: { action: 'generate', prompt, ...options },
    });
  },

  async stream(prompt: string, onChunk: (text: string) => void, signal?: AbortSignal, options?: { system?: string; model?: string }) {
    return apiStream('/api/v2/ai', { action: 'stream', prompt, ...options }, onChunk, signal);
  },

  async embed(text: string) {
    return apiFetch<{ embedding: number[]; dim: number }>('/api/v2/ai', {
      method: 'POST',
      json: { action: 'embed', text },
    });
  },

  async analyze(content: string, noteId?: string, model?: string) {
    return apiFetch<{ text: string }>('/api/v2/ai', {
      method: 'POST',
      json: { action: 'analyze', content, noteId, model },
    });
  },

  async pullModel(model: string) {
    return apiFetch('/api/v2/ai', {
      method: 'POST',
      json: { action: 'pull', model },
    });
  },
};

// ─── Files ──────────────────────────────────────────────────────────────────

export interface FileInfo {
  id: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number;
  checksum: string | null;
  createdAt: string;
}

export const files = {
  async list() {
    return apiFetch<{ files: FileInfo[] }>('/api/v2/files');
  },

  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/v2/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  async getDownloadUrl(id: string) {
    return apiFetch<{ url: string; expiresInSeconds: number }>(`/api/v2/files/${id}`);
  },

  async delete(id: string) {
    await apiFetch(`/api/v2/files/${id}`, { method: 'DELETE' });
  },
};

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchHit {
  type: 'note' | 'node' | 'file' | 'memory' | 'embedding';
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export const search = {
  async query(query: string, limit?: number) {
    return apiFetch<{ results: SearchHit[]; total: number }>('/api/v2/search', {
      method: 'POST',
      json: { query, limit },
    });
  },
};

// ─── Video ──────────────────────────────────────────────────────────────────

export const video = {
  async extractTranscript(videoUrl: string) {
    return apiFetch<{ memoryId: string; videoInfo: unknown }>('/api/v2/video', {
      method: 'POST',
      json: { action: 'transcript', videoUrl },
    });
  },

  async transcribeAudio(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/v2/video`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: (() => { const fd = new FormData(); fd.append('action', 'audio'); fd.append('file', file); return fd; })(),
    });
    if (!res.ok) throw new Error('Transcription failed');
    return res.json();
  },

  async status() {
    return apiFetch<{ ytdlp: boolean; whisper: { available: boolean } }>('/api/v2/video/status');
  },
};

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface UserStats {
  notes: number;
  nodes: number;
  reminders: number;
  files: number;
  datasets: number;
  chatMessages: number;
  memories: number;
  browserData: number;
}

export const stats = {
  async get() {
    return apiFetch<UserStats>('/api/v2/stats');
  },
};

// ─── Analytics ──────────────────────────────────────────────────────────────

export const analytics = {
  async track(event: string, url: string, props?: Record<string, unknown>) {
    await apiFetch('/api/v2/analytics', {
      method: 'POST',
      json: {
        event,
        url,
        props,
        sessionId: getSessionId(),
        screenWidth: typeof window !== 'undefined' ? window.screen.width : undefined,
      },
    });
  },

  async getStats(range = '7d') {
    return apiFetch(`/api/v2/analytics/stats?range=${range}`);
  },
};

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem('swacana-session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('swacana-session', id);
  }
  return id;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ApiKey {
  id: string;
  label: string;
  scopes: string[];
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  targetDate: string;
  isAcknowledged: boolean;
}

export interface DatasetInfo {
  id: string;
  hfDatasetId: string;
  status: string;
  totalChunks: number;
}
