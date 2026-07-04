/**
 * GET    /api/v2/notes/[id]/chat — Get chat history
 * POST   /api/v2/notes/[id]/chat — Send message (streaming via SSE)
 * DELETE /api/v2/notes/[id]/chat — Clear chat history
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import { streamChat, DEFAULT_MODEL, SYSTEM_PROMPTS } from '@/lib/server/ollama';
import { buildAugmentedPrompt } from '@/lib/server/rag';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── Get History ────────────────────────────────────────────────────────────

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: noteId } = await params;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: user.id } });
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const messages = await prisma.chatMessage.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages: messages.map((m: typeof messages[number]) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations,
      createdAt: m.createdAt.toISOString(),
    }))});
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Send Message (Streaming) ──────────────────────────────────────────────

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: noteId } = await params;
    const body = await request.json();
    const { content, model, chatMode } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: user.id } });
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Save user message
    await prisma.chatMessage.create({
      data: { noteId, role: 'user', content },
    });

    // Build system prompt based on chat mode
    const modePrompts: Record<string, string> = {
      default: SYSTEM_PROMPTS.default,
      analitis: SYSTEM_PROMPTS.analitis,
      ringkas: SYSTEM_PROMPTS.ringkas,
      custom: note.customPrompt || SYSTEM_PROMPTS.default,
    };
    const basePrompt = modePrompts[chatMode || note.chatMode] || SYSTEM_PROMPTS.default;

    // Build RAG-augmented prompt
    const { systemPrompt, citations } = await buildAugmentedPrompt(noteId, content, basePrompt);

    // Stream response
    const encoder = new TextEncoder();
    const assistantId = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        try {
          const messages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content },
          ];

          for await (const chunk of streamChat(messages, {
            model: model || DEFAULT_MODEL,
          })) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          // Save assistant message
          await prisma.chatMessage.create({
            data: {
              id: assistantId,
              noteId,
              role: 'assistant',
              content: fullResponse,
              citations: citations && citations.length > 0 ? JSON.parse(JSON.stringify(citations)) : undefined,
            },
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, id: assistantId })}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Clear History ──────────────────────────────────────────────────────────

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: noteId } = await params;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: user.id } });
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.chatMessage.deleteMany({ where: { noteId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
