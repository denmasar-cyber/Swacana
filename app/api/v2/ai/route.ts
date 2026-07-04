/**
 * POST /api/v2/ai/generate     — Non-streaming text generation
 * POST /api/v2/ai/stream       — Streaming text generation (SSE)
 * POST /api/v2/ai/chat         — Chat completion (streaming)
 * POST /api/v2/ai/embed        — Generate text embedding
 * POST /api/v2/ai/analyze      — Run causal analysis (guardrail)
 * GET  /api/v2/ai/models       — List available Ollama models
 * POST /api/v2/ai/pull         — Pull a model
 * GET  /api/v2/ai/status       — Ollama health status
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import {
  generate,
  streamGenerate,
  chat,
  streamChat,
  embedText,
  listModels,
  pullModel,
  checkOllamaHealth,
  SYSTEM_PROMPTS,
  DEFAULT_MODEL,
  RECOMMENDED_MODELS,
} from '@/lib/server/ollama';
import prisma from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      const healthy = await checkOllamaHealth();
      const models = healthy ? await listModels() : [];
      return NextResponse.json({
        healthy,
        modelCount: models.length,
        models: models.map((m) => ({ name: m.name, size: m.size })),
        recommended: RECOMMENDED_MODELS,
      });
    }

    if (action === 'models') {
      const models = await listModels();
      return NextResponse.json({ models, recommended: RECOMMENDED_MODELS });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { action } = body;

    // ── Pull Model ──
    if (action === 'pull') {
      const { model } = body;
      if (!model) {
        return NextResponse.json({ error: 'Model name required' }, { status: 400 });
      }
      // Pull in background — client polls status
      pullModel(model).catch(console.error);
      return NextResponse.json({ ok: true, message: `Pulling ${model}...` });
    }

    // ── Embed ──
    if (action === 'embed') {
      const { text } = body;
      if (!text) {
        return NextResponse.json({ error: 'Text required' }, { status: 400 });
      }
      const embedding = await embedText(text);
      return NextResponse.json({ embedding, dim: embedding.length });
    }

    // ── Generate (non-streaming) ──
    if (action === 'generate') {
      const { prompt, system, model, temperature, maxTokens } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
      }
      const result = await generate(prompt, {
        model: model || DEFAULT_MODEL,
        system: system || SYSTEM_PROMPTS.default,
        temperature,
        num_predict: maxTokens,
      });
      return NextResponse.json({ text: result });
    }

    // ── Stream (SSE) ──
    if (action === 'stream') {
      const { prompt, system, model, temperature, maxTokens } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamGenerate(prompt, {
              model: model || DEFAULT_MODEL,
              system: system || SYSTEM_PROMPTS.default,
              temperature,
              num_predict: maxTokens,
            })) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
    }

    // ── Chat (SSE) ──
    if (action === 'chat') {
      const { messages, model, temperature, maxTokens } = body;
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamChat(messages, {
              model: model || DEFAULT_MODEL,
              temperature,
              num_predict: maxTokens,
            })) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
    }

    // ── Analyze (Guardrail causal analysis) ──
    if (action === 'analyze') {
      const { noteId, content, model } = body;
      if (!content) {
        return NextResponse.json({ error: 'Content required' }, { status: 400 });
      }

      let augmentedPrompt = SYSTEM_PROMPTS.guardrail;

      // If noteId provided, try to augment with RAG context
      if (noteId) {
        const embeddings = await prisma.embedding.findMany({
          where: { noteId },
          include: { chunk: true },
          take: 5,
        });

        if (embeddings.length > 0) {
          const context = embeddings
            .map((e, i) => `[${i + 1}] ${e.chunk?.text || ''}`)
            .filter(Boolean)
            .join('\n\n');
          augmentedPrompt += `\n\n=== ATTACHED DATA ===\n${context}\n=== END ===`;
        }
      }

      const result = await generate(content, {
        model: model || DEFAULT_MODEL,
        system: augmentedPrompt,
        temperature: 0.7,
        num_predict: 4096,
      });

      return NextResponse.json({ text: result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
