/**
 * Swacana WebSocket Relay Server
 * Run alongside Next.js: node -r tsx server/ws-server.ts
 * Or use the "dev:collab" script.
 *
 * This is a simple relay — it broadcasts note updates to all connected clients
 * who are viewing the same note. No persistence, no authentication.
 */

import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const wss = new WebSocketServer({ port: PORT });

interface CollabMessage {
  type: 'join' | 'leave' | 'update' | 'cursor' | 'presence';
  noteId?: string;
  userId?: string;
  userName?: string;
  data?: unknown;
  timestamp?: string;
}

// Room: noteId -> Set<WebSocket>
const rooms = new Map<string, Set<WebSocket>>();
// Client metadata
const clientInfo = new Map<WebSocket, { userId: string; userName: string; noteId: string | null }>();

wss.on('connection', (ws: WebSocket) => {
  const id = `user-${Math.random().toString(36).slice(2, 8)}`;
  clientInfo.set(ws, { userId: id, userName: `User ${id.slice(-4)}`, noteId: null });

  console.log(`[ws] Client connected: ${id}`);

  ws.on('message', (raw: Buffer) => {
    try {
      const msg: CollabMessage = JSON.parse(raw.toString());
      const info = clientInfo.get(ws);
      if (!info) return;

      // Update stored name
      if (msg.userName) info.userName = msg.userName;

      switch (msg.type) {
        case 'join': {
          const noteId = msg.noteId;
          if (!noteId) break;

          // Leave previous room
          if (info.noteId) {
            const prevRoom = rooms.get(info.noteId);
            if (prevRoom) {
              prevRoom.delete(ws);
              if (prevRoom.size === 0) rooms.delete(info.noteId);
              broadcastToRoom(info.noteId, {
                type: 'presence',
                userId: info.userId,
                userName: info.userName,
                noteId: info.noteId,
                data: { action: 'leave' },
              } as CollabMessage, ws);
            }
          }

          info.noteId = noteId;
          if (!rooms.has(noteId)) rooms.set(noteId, new Set());
          rooms.get(noteId)!.add(ws);

          // Announce join
          broadcastToRoom(noteId, {
            type: 'presence',
            userId: info.userId,
            userName: info.userName,
            noteId,
            data: { action: 'join' },
          } as CollabMessage, ws);

          // Send current room members to the new joiner
          const members = Array.from(rooms.get(noteId)!)
            .filter((s) => s !== ws)
            .map((s) => {
              const ci = clientInfo.get(s);
              return ci ? { userId: ci.userId, userName: ci.userName } : null;
            })
            .filter(Boolean);

          ws.send(JSON.stringify({
            type: 'presence',
            userId: 'system',
            userName: 'System',
            noteId,
            data: { action: 'members', members, yourId: info.userId },
          } as CollabMessage));

          console.log(`[ws] ${info.userName} joined ${noteId}`);
          break;
        }

        case 'update':
        case 'cursor': {
          if (info.noteId) {
            msg.userId = info.userId;
            msg.userName = info.userName;
            msg.timestamp = new Date().toISOString();
            broadcastToRoom(info.noteId, msg, ws);
          }
          break;
        }

        case 'leave': {
          if (info.noteId) {
            broadcastToRoom(info.noteId, {
              type: 'presence',
              userId: info.userId,
              userName: info.userName,
              noteId: info.noteId,
              data: { action: 'leave' },
            } as CollabMessage, ws);

            const room = rooms.get(info.noteId);
            if (room) {
              room.delete(ws);
              if (room.size === 0) rooms.delete(info.noteId);
            }
            info.noteId = null;
          }
          break;
        }
      }
    } catch (err) {
      console.error('[ws] Invalid message:', err);
    }
  });

  ws.on('close', () => {
    const info = clientInfo.get(ws);
    if (info?.noteId) {
      broadcastToRoom(info.noteId, {
        type: 'presence',
        userId: info.userId,
        userName: info.userName,
        noteId: info.noteId,
        data: { action: 'leave' },
      } as CollabMessage, ws);

      const room = rooms.get(info.noteId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) rooms.delete(info.noteId);
      }
    }
    clientInfo.delete(ws);
    console.log(`[ws] Client disconnected: ${id}`);
  });

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'presence',
    userId: 'system',
    userName: 'System',
    data: { action: 'connected', yourId: id },
  } as CollabMessage));
});

function broadcastToRoom(noteId: string, msg: CollabMessage, sender?: WebSocket) {
  const room = rooms.get(noteId);
  if (!room) return;
  const payload = JSON.stringify(msg);
  for (const client of room) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

console.log(`[ws] Swacana collaboration server running on ws://localhost:${PORT}`);
console.log(`[ws] Set WS_PORT env to change port (current: ${PORT})`);
