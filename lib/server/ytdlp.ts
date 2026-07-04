/**
 * SWACANA v2 — YouTube Transcript Extractor (yt-dlp)
 *
 * Extracts transcripts/subtitles from YouTube videos.
 * Transcripts are stored in MinIO + agent_memory for RAG search.
 *
 * Requires yt-dlp installed on VPS:
 *   pip install yt-dlp
 *   # or
 *   brew install yt-dlp
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { uploadText } from './minio';
import prisma from './db';

const execFileAsync = promisify(execFile);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VideoInfo {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  description: string;
  thumbnail: string;
  url: string;
}

export interface TranscriptResult {
  videoInfo: VideoInfo;
  transcript: string;
  language: string;
}

// ─── Transcript Extraction ──────────────────────────────────────────────────

/**
 * Extract transcript from a YouTube video URL.
 *
 * Uses yt-dlp to:
 * 1. Get video metadata
 * 2. Download auto-generated or manual subtitles
 * 3. Convert to plain text
 */
export async function extractTranscript(
  videoUrl: string,
): Promise<TranscriptResult> {
  // Validate URL
  if (!isValidYouTubeUrl(videoUrl)) {
    throw new Error('Invalid YouTube URL');
  }

  // Get video info
  const videoInfo = await getVideoInfo(videoUrl);

  // Try to extract subtitles
  try {
    const transcript = await downloadSubtitles(videoUrl);
    return { videoInfo, transcript, language: 'en' };
  } catch {
    // No subtitles available — try auto-generated
    try {
      const transcript = await downloadAutoSubtitles(videoUrl);
      return { videoInfo, transcript, language: 'en' };
    } catch {
      throw new Error('No subtitles available for this video');
    }
  }
}

/**
 * Get video metadata without downloading
 */
export async function getVideoInfo(videoUrl: string): Promise<VideoInfo> {
  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--dump-json',
      '--no-download',
      videoUrl,
    ], { timeout: 30_000 });

    const info = JSON.parse(stdout);
    return {
      id: info.id || '',
      title: info.title || 'Unknown',
      uploader: info.uploader || info.channel || 'Unknown',
      duration: info.duration || 0,
      description: (info.description || '').slice(0, 500),
      thumbnail: info.thumbnail || '',
      url: videoUrl,
    };
  } catch (err) {
    throw new Error(`Failed to get video info: ${(err as Error).message}`);
  }
}

/**
 * Download subtitles (manual) via yt-dlp
 */
async function downloadSubtitles(videoUrl: string): Promise<string> {
  const { stdout } = await execFileAsync('yt-dlp', [
    '--write-sub',
    '--sub-lang', 'en',
    '--skip-download',
    '--sub-format', 'vtt',
    '-o', '/tmp/swacana-ytdlp-%(id)s',
    '--no-warnings',
    videoUrl,
  ], { timeout: 60_000 });

  // yt-dlp writes subtitle files, we need to read them
  // Actually, let's use a simpler approach: extract subtitles to stdout
  const { stdout: subText } = await execFileAsync('yt-dlp', [
    '--write-sub',
    '--sub-lang', 'en',
    '--skip-download',
    '--sub-format', 'json3',
    '-o', '/tmp/swacana-sub-%(id)s',
    '--no-warnings',
    videoUrl,
  ], { timeout: 60_000 });

  // Parse VTT/JSON subtitle to plain text
  return parseSubtitleOutput(subText);
}

/**
 * Download auto-generated subtitles via yt-dlp
 */
async function downloadAutoSubtitles(videoUrl: string): Promise<string> {
  const { stdout } = await execFileAsync('yt-dlp', [
    '--write-auto-sub',
    '--sub-lang', 'en',
    '--skip-download',
    '--sub-format', 'vtt',
    '-o', '/tmp/swacana-ytdlp-%(id)s',
    '--no-warnings',
    videoUrl,
  ], { timeout: 60_000 });

  return parseSubtitleOutput(stdout);
}

/**
 * Parse subtitle output to plain text
 */
function parseSubtitleOutput(raw: string): string {
  // Remove VTT headers and timestamps
  const lines = raw.split('\n');
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip timestamps, WEBVTT header, empty lines, and position tags
    if (
      !trimmed ||
      trimmed.startsWith('WEBVTT') ||
      trimmed.startsWith('Kind:') ||
      trimmed.startsWith('Language:') ||
      /^\d{2}:\d{2}/.test(trimmed) ||
      trimmed.includes('-->') ||
      trimmed.startsWith('<') ||
      trimmed.startsWith('NOTE')
    ) {
      continue;
    }
    textLines.push(trimmed);
  }

  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}

// ─── Save to Storage ────────────────────────────────────────────────────────

/**
 * Extract and save video transcript to MinIO + database.
 * Creates agent_memory entry for RAG search.
 */
export async function extractAndSaveTranscript(
  userId: string,
  videoUrl: string,
): Promise<{ memoryId: string; videoInfo: VideoInfo }> {
  const { videoInfo, transcript } = await extractTranscript(videoUrl);

  // Save transcript to MinIO
  const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await uploadText(userId, `${safeTitle}-${timestamp}.txt`, transcript);

  // Save to agent_memory for RAG search
  const memory = await prisma.agentMemory.create({
    data: {
      userId,
      type: 'video_transcript',
      content: `[${videoInfo.title}] by ${videoInfo.uploader}\n\n${transcript}`,
      context: `${videoInfo.title} (${videoInfo.duration}s)`,
      sourceUrl: videoUrl,
    },
  });

  return { memoryId: memory.id, videoInfo };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'youtu.be' ||
      parsed.hostname === 'm.youtube.com'
    );
  } catch {
    return false;
  }
}

/**
 * Check if yt-dlp is installed on the server
 */
export async function isYtdlpAvailable(): Promise<boolean> {
  try {
    await execFileAsync('yt-dlp', ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
