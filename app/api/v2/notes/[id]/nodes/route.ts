/**
 * GET    /api/v2/notes/[id]/nodes      — List nodes for a note
 * POST   /api/v2/notes/[id]/nodes      — Create a node
 * PATCH  /api/v2/notes/[id]/nodes/[nodeId] — Update node
 * DELETE /api/v2/notes/[id]/nodes/[nodeId] — Delete node
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── List Nodes ─────────────────────────────────────────────────────────────

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: noteId } = await params;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: user.id } });
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const nodes = await prisma.kiroNode.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ nodes });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Create Node ────────────────────────────────────────────────────────────

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: noteId } = await params;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: user.id } });
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { parentId, nodeType, label, details, targetDate } = body;

    const node = await prisma.kiroNode.create({
      data: {
        noteId,
        parentId: parentId || null,
        nodeType: nodeType || 'DIAGNOSIS',
        label: label || 'New Node',
        details: details || '',
        targetDate: targetDate || null,
      },
    });

    // Create reminder for MITIGATION nodes
    if (nodeType === 'MITIGATION' && targetDate) {
      await prisma.reminder.create({
        data: { noteId, nodeId: node.id, title: label || 'Task', targetDate },
      });
    }

    return NextResponse.json({ node }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
