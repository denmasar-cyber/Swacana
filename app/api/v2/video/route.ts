/**
 * POST /api/v2/video/transcript — Extract YouTube transcript
 * POST /api/v2/video/audio     — Transcribe audio file
 * GET  /api/v2/video/status    — Check yt-dlp/whisper availability
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { extractAndSaveTranscript, isYtdlpAvailable } from '@/lib/server/ytdlp';
import { transcribeAudio, saveTranscription, checkWhisperStatus } from '@/lib/server/whisper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const ytdlp = await isYtdlpAvailable();
    const whisper = await checkWhisperStatus();
    return NextResponse.json({ ytdlp, whisper });
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

    if (action === 'transcript') {
      const { videoUrl } = body;
      if (!videoUrl) {
        return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });
      }
      const result = await extractAndSaveTranscript(user.id, videoUrl);
      return NextResponse.json(result);
    }

    if (action === 'audio') {
      const formData = await request.formData();
      const file = (formData as unknown as Map<string, File>).get('file') || null;
      if (!file) {
        return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const transcription = await transcribeAudio(buffer, file.name, file.type);
      if (!transcription) {
        return NextResponse.json({ error: 'No transcription backend available' }, { status: 501 });
      }
      const memoryId = await saveTranscription(user.id, null, transcription);
      return NextResponse.json({ memoryId, text: transcription.text });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
