'use client';

import { useEffect, useState } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  initSync,
  destroySync,
  joinNote,
  leaveNote,
  subscribe,
  type SyncMessage,
  type CollabUser,
  getCurrentUser,
} from '@/lib/sync';

interface Props {
  noteId: string;
}

export default function CollaborationBar({ noteId }: Props) {
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myId, setMyId] = useState<string>('');

  useEffect(() => {
    const user = getCurrentUser();
    setMyId(user.userId);
    initSync(user.userId, user.userName);

    // Join the note room
    joinNote(noteId);

    const unsub = subscribe((msg: SyncMessage) => {
      if (msg.noteId !== noteId) return;

      switch (msg.type) {
        case 'presence': {
          const data = msg.data as Record<string, unknown> | undefined;
          if (!data) break;

          if (data.action === 'join') {
            setUsers((prev) => {
              if (prev.some((u) => u.userId === msg.userId)) return prev;
              return [...prev, { userId: msg.userId!, userName: msg.userName! }];
            });
            setIsConnected(true);
          } else if (data.action === 'leave') {
            setUsers((prev) => prev.filter((u) => u.userId !== msg.userId));
          } else if (data.action === 'members') {
            const members = data.members as CollabUser[] | undefined;
            if (members) {
              setUsers(members);
            }
            if (data.yourId) {
              setMyId(data.yourId as string);
            }
          } else if (data.action === 'connected') {
            setIsConnected(true);
            if (data.yourId) {
              setMyId(data.yourId as string);
            }
          }
          break;
        }
        case 'cursor':
          // Future: show cursor positions
          break;
      }
    });

    return () => {
      unsub();
      leaveNote();
      destroySync();
    };
  }, [noteId]);

  if (users.length === 0 && !isConnected) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-surface2/50 border border-border/50">
      <Users size={11} className="text-muted" />
      <span className="relative flex h-2 w-2">
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isConnected ? 'bg-success' : 'bg-muted')} />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', isConnected ? 'bg-success' : 'bg-muted')} />
      </span>
      <div className="flex items-center -space-x-1">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.userId}
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-background',
              user.userId === myId ? 'bg-accent text-white border-accent2' : 'bg-surface3 text-foreground/80 border-border',
            )}
            title={user.userName}
          >
            {user.userName.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      {users.length > 0 && (
        <span className="text-[9px] text-muted">
          {users.filter((u) => u.userId !== myId).map((u) => u.userName).join(', ') || 'Only you'}
        </span>
      )}
      {isConnected ? <Wifi size={10} className="text-success/50 ml-auto" /> : <WifiOff size={10} className="text-muted/60 ml-auto" />}
    </div>
  );
}
