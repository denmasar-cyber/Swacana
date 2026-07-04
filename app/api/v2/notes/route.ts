/**
 * GET    /api/v2/notes          — List all user notes
 * POST   /api/v2/notes          — Create a new note
 * GET    /api/v2/notes/:id      — Get a single note
 * PATCH  /api/v2/notes/:id      — Update a note
 * DELETE /api/v2/notes/:id      — Delete a note
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';

export const dynamic = 'force-dynamic';

// ─── List Notes ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';

    const where: Record<string, unknown> = { userId: user.id };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          _count: { select: { nodes: true, chatMessages: true, datasets: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.note.count({ where }),
    ]);

    return NextResponse.json({
      notes: notes.map((n: typeof notes[number]) => ({
        id: n.id,
        title: n.title,
        content: n.content.slice(0, 200),
        tags: n.tags,
        chatMode: n.chatMode,
        nodeCount: n._count.nodes,
        chatCount: n._count.chatMessages,
        datasetCount: n._count.datasets,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Create Note ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { title, content, tags, chatMode, customPrompt } = body;

    const note = await prisma.note.create({
      data: {
        userId: user.id,
        title: title || 'Catatan Baru',
        content: content || '',
        tags: tags || [],
        chatMode: chatMode || 'default',
        customPrompt: customPrompt || null,
      },
    });

    return NextResponse.json({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      chatMode: note.chatMode,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
