/**
 * SWACANA v2 — Whisper Voice Transcription
 *
 * Server-side speech-to-text using OpenAI Whisper (open source).
 * Can run via:
 * 1. whisper.cpp HTTP server (fastest, if running)
 * 2. Fallback to browser Web Speech API
 *
 * Transcriptions are stored in agent_memory for RAG search.
 */

import { uploadText } from './minio';
import prisma from './db';

// ─── Configuration ──────────────────────────────────────────────────────────

const WHISPER_API = process.env.WHISPER_API || 'http://localhost:8080';

// ─── Transcription ──────────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Transcribe audio buffer using Whisper.
 * Tries whisper.cpp HTTP server first.
 * Falls back to null (client should use Web Speech API).
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<TranscriptionResult | null> {
  // Try whisper.cpp server first
  try {
    return await transcribeViaWhisperCpp(audioBuffer, filename, mimeType);
  } catch {
    console.warn('[Whisper] whisper.cpp not available');
  }

  console.warn('[Whisper] No transcription backend available. Audio stored but not transcribed.');
  return null;
}

/**
 * Transcribe via whisper.cpp HTTP server
 * Run: whisper-server --model ggml-base.en.bin --port 8080
 */
async function transcribeViaWhisperCpp(
  audioBuffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<TranscriptionResult> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('response_format', 'verbose_json');

  const res = await fetch(`${WHISPER_API}/inference`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`Whisper.cpp error: ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.text || '',
    language: data.language,
    duration: data.duration,
    segments: data.segments?.map((s: { start: number; end: number; text: string }) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}

// ─── Save Transcription to Storage ──────────────────────────────────────────

/**
 * Save audio transcription to MinIO + database.
 * Creates an agent_memory entry for RAG search.
 */
export async function saveTranscription(
  userId: string,
  noteId: string | null,
  transcription: TranscriptionResult,
  sourceUrl?: string,
): Promise<string> {
  // Save raw transcription text to MinIO
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await uploadText(userId, `${timestamp}.txt`, transcription.text);

  // Save to agent_memory for RAG search
  const memory = await prisma.agentMemory.create({
    data: {
      userId,
      type: 'video_transcript',
      content: transcription.text,
      context: sourceUrl || 'voice_recording',
      sourceUrl,
    },
  });

  return memory.id;
}

// ─── Transcription Status ───────────────────────────────────────────────────

export interface WhisperStatus {
  whisperCpp: boolean;
  available: boolean;
}

export async function checkWhisperStatus(): Promise<WhisperStatus> {
  let whisperCpp = false;

  try {
    const res = await fetch(`${WHISPER_API}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    whisperCpp = res.ok;
  } catch { /* not running */ }

  return {
    whisperCpp,
    available: whisperCpp,
  };
}
