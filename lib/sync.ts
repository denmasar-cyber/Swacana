/**
 * SWACANA v2 — Real-time Sync (Server-backed)
 *
 * Two-tier sync:
 * 1. WebSocket to VPS — cross-device, persistent
 * 2. BroadcastChannel — same-browser fallback (free)
 *
 * Now with user authentication — only the owner sees their data.
 */

type SyncCallback = (msg: SyncMessage) => void;

export interface SyncMessage {
  type: 'join' | 'leave' | 'update' | 'cursor' | 'presence' | 'note-change';
  noteId?: string;
  userId?: string;
  userName?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export interface CollabUser {
  userId: string;
  userName: string;
}

let ws: WebSocket | null = null;
let bc: BroadcastChannel | null = null;
let currentNoteId: string | null = null;
let currentUserId: string = '';
let currentUserName = '';
const listeners = new Set<SyncCallback>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

// ─── Initialization ─────────────────────────────────────────────────────────

export function initSync(userId: string, userName: string) {
  currentUserId = userId;
  currentUserName = userName;
  initBroadcastChannel();
  connectWebSocket();
}

// ─── BroadcastChannel (same-browser) ────────────────────────────────────────

function initBroadcastChannel() {
  if (typeof window === 'undefined') return;
  try {
    bc = new BroadcastChannel('swacana-sync');
    bc.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data.userId === currentUserId) return;
      notifyListeners(event.data);
    };
  } catch {
    console.warn('[sync] BroadcastChannel not available');
  }
}

function sendBroadcast(msg: SyncMessage) {
  bc?.postMessage(msg);
}

// ─── WebSocket (server-backed) ──────────────────────────────────────────────

function getWsUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ws') || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
}

function connectWebSocket() {
  const url = getWsUrl();
  if (!url) return;

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[sync] WebSocket connected');
      reconnectAttempts = 0;
      // Authenticate
      ws?.send(JSON.stringify({
        type: 'auth',
        userId: currentUserId,
        userName: currentUserName,
      }));
      // Re-join current room
      if (currentNoteId) {
        sendMessage({ type: 'join', noteId: currentNoteId });
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data);
        notifyListeners(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      console.log('[sync] WebSocket disconnected');
      ws = null;
      // Exponential backoff reconnect
      reconnectAttempts++;
      if (reconnectAttempts <= MAX_RECONNECT) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimer = setTimeout(() => connectWebSocket(), delay);
      }
    };

    ws.onerror = () => ws?.close();
  } catch {
    ws = null;
  }
}

function sendWebSocket(msg: SyncMessage) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

function notifyListeners(msg: SyncMessage) {
  for (const cb of listeners) {
    try { cb(msg); } catch { /* ignore */ }
  }
}

export function sendMessage(msg: Omit<SyncMessage, 'userId' | 'userName'>) {
  const full: SyncMessage = {
    ...msg,
    userId: currentUserId,
    userName: currentUserName,
    timestamp: new Date().toISOString(),
  };
  sendBroadcast(full);
  sendWebSocket(full);
}

export function subscribe(callback: SyncCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setUserName(name: string) {
  currentUserName = name;
}

export function getCurrentUser(): CollabUser {
  return { userId: currentUserId, userName: currentUserName };
}

export function joinNote(noteId: string) {
  currentNoteId = noteId;
  sendMessage({ type: 'join', noteId });
}

export function leaveNote() {
  if (currentNoteId) {
    sendMessage({ type: 'leave', noteId: currentNoteId });
  }
  currentNoteId = null;
}

export function sendCursorUpdate(data: Record<string, unknown>) {
  sendMessage({ type: 'cursor', noteId: currentNoteId ?? undefined, data });
}

export function notifyNoteChange(noteId: string) {
  sendMessage({ type: 'note-change', noteId });
}

export function destroySync() {
  leaveNote();
  ws?.close();
  ws = null;
  bc?.close();
  bc = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  listeners.clear();
  reconnectAttempts = 0;
}
