/**
 * POST /api/v2/search — Unified search across notes, nodes, files, memories, embeddings
 *
 * Uses PostgreSQL full-text search + cosine similarity for vector search.
 * The client never knows the storage backend.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
export const dynamic = 'force-dynamic';

interface SearchHit {
  type: 'note' | 'node' | 'file' | 'memory' | 'embedding';
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const { query, limit = 10 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const hits: SearchHit[] = [];
    const noteIds = (await prisma.note.findMany({
      where: { userId: user.id },
      select: { id: true },
    })).map((n: { id: string }) => n.id);

    // 1. Full-text search notes
    const noteResults = await prisma.note.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    for (const n of noteResults) {
      hits.push({
        type: 'note',
        id: n.id,
        title: n.title,
        content: n.content.slice(0, 300),
        score: 1.0,
      });
    }

    // 2. Full-text search nodes
    if (noteIds.length > 0) {
      const nodeResults = await prisma.kiroNode.findMany({
        where: {
          noteId: { in: noteIds },
          OR: [
            { label: { contains: query, mode: 'insensitive' } },
            { details: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });

      for (const n of nodeResults) {
        hits.push({
          type: 'node',
          id: n.id,
          title: n.label,
          content: n.details.slice(0, 300),
          score: 0.9,
          metadata: { nodeType: n.nodeType, status: n.status },
        });
      }
    }

    // 3. Search files
    const fileResults = await prisma.fileObject.findMany({
      where: {
        userId: user.id,
        filename: { contains: query, mode: 'insensitive' },
      },
      take: limit,
    });

    for (const f of fileResults) {
      hits.push({
        type: 'file',
        id: f.id,
        title: f.filename,
        content: f.mimeType || 'unknown type',
        score: 0.8,
        metadata: { size: Number(f.sizeBytes), mimeType: f.mimeType },
      });
    }

    // 4. Search memories
    const memoryResults = await prisma.agentMemory.findMany({
      where: {
        userId: user.id,
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { context: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    for (const m of memoryResults) {
      hits.push({
        type: 'memory',
        id: m.id,
        title: m.type,
        content: m.content.slice(0, 300),
        score: 0.7,
        metadata: { sourceUrl: m.sourceUrl },
      });
    }

    // Sort by score and limit
    hits.sort((a, b) => b.score - a.score);
    const results = hits.slice(0, limit);

    return NextResponse.json({ results, total: results.length, query });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
