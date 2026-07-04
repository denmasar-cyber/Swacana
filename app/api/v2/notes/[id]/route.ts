/**
 * GET    /api/v2/notes/[id]      — Get note with nodes, reminders, datasets
 * PATCH  /api/v2/notes/[id]      — Update note
 * DELETE /api/v2/notes/[id]      — Delete note and all children
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── Get Note ───────────────────────────────────────────────────────────────

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: { id, userId: user.id },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        reminders: { where: { isAcknowledged: false } },
        datasets: {
          where: { isEnabled: true },
          select: { id: true, hfDatasetId: true, status: true, totalChunks: true },
        },
        _count: { select: { chatMessages: true } },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      chatMode: note.chatMode,
      customPrompt: note.customPrompt,
      nodes: note.nodes.map((n: typeof note.nodes[number]) => ({
        id: n.id,
        parentId: n.parentId,
        nodeType: n.nodeType,
        label: n.label,
        details: n.details,
        targetDate: n.targetDate,
        status: n.status,
      })),
      reminders: note.reminders,
      datasets: note.datasets,
      chatCount: note._count.chatMessages,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Update Note ────────────────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.chatMode !== undefined && { chatMode: body.chatMode }),
        ...(body.customPrompt !== undefined && { customPrompt: body.customPrompt }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      tags: updated.tags,
      chatMode: updated.chatMode,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Delete Note ────────────────────────────────────────────────────────────

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const existing = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Cascade delete via Prisma
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { noteId: id } }),
      prisma.embedding.deleteMany({ where: { noteId: id } }),
      prisma.chunk.deleteMany({ where: { noteId: id } }),
      prisma.dataset.deleteMany({ where: { noteId: id } }),
      prisma.reminder.deleteMany({ where: { noteId: id } }),
      prisma.kiroNode.deleteMany({ where: { noteId: id } }),
      prisma.note.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
