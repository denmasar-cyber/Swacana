/**
 * GET  /api/v2/stats — Server-wide statistics
 * GET  /api/v2/stats/search — Full-text + vector search across all user data
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const [notes, nodes, reminders, files, datasets, chatMessages, memories, browserData] = await Promise.all([
      prisma.note.count({ where: { userId: user.id } }),
      prisma.note.findMany({ where: { userId: user.id }, select: { id: true } }).then(
        (ns: { id: string }[]) => prisma.kiroNode.count({ where: { noteId: { in: ns.map((n: { id: string }) => n.id) } } }),
      ),
      prisma.reminder.count({
        where: {
          isAcknowledged: false,
          note: { userId: user.id },
        },
      }),
      prisma.fileObject.count({ where: { userId: user.id } }),
      prisma.dataset.count({ where: { note: { userId: user.id } } }),
      prisma.chatMessage.count({ where: { note: { userId: user.id } } }),
      prisma.agentMemory.count({ where: { userId: user.id } }),
      prisma.browserData.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      notes,
      nodes,
      reminders,
      files,
      datasets,
      chatMessages,
      memories,
      browserData,
    });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
