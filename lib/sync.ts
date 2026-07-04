'use client';

/**
 * Swacana Real-time Sync
 *
 * Two-tier sync:
 * 1. BroadcastChannel — same-browser cross-tab sync (free)
 * 2. WebSocket — cross-device sync via relay server
 */

type SyncCallback = (msg: SyncMessage) => void;

export interface SyncMessage {
  type: 'join' | 'leave' | 'update' | 'cursor' | 'presence';
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
let currentUserId = `local-${Math.random().toString(36).slice(2, 8)}`;
let currentUserName = `User ${currentUserId.slice(-4)}`;
let listeners = new Set<SyncCallback>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ─── BroadcastChannel (same-browser) ────────────────────────────────────

function initBroadcastChannel() {
  if (typeof window === 'undefined') return;
  try {
    bc = new BroadcastChannel('swacana-sync');
    bc.onmessage = (event: MessageEvent<SyncMessage>) => {
      // Don't echo back our own messages
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

// ─── WebSocket (cross-device) ────────────────────────────────────────────

function getWsUrl(): string | null {
  if (typeof window === 'undefined') return null;
  // Default to localhost:3001, configurable via env or query param
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
      // Re-join current room
      if (currentNoteId) {
        sendMessage({ type: 'join', noteId: currentNoteId });
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data as string);
        notifyListeners(msg);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      console.log('[sync] WebSocket disconnected');
      ws = null;
      // Auto-reconnect after 3s
      reconnectTimer = setTimeout(() => connectWebSocket(), 3000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    console.warn('[sync] WebSocket connection failed (server may not be running)');
    ws = null;
  }
}

function sendWebSocket(msg: SyncMessage) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

function notifyListeners(msg: SyncMessage) {
  for (const cb of listeners) {
    try { cb(msg); } catch { /* ignore callback error */ }
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

export function initSync() {
  initBroadcastChannel();
  connectWebSocket();
}

export function destroySync() {
  leaveNote();
  ws?.close();
  ws = null;
  bc?.close();
  bc = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  listeners.clear();
}
