/**
 * GET /api/stats
 *
 * Returns statistics from the SWACANA CLI's SQLite database.
 * This bridges the CLI (which stores data in ~/.swacana/data/swacana.db)
 * with the web dashboard.
 *
 * Response:
 * {
 *   exists: boolean,
 *   notes: number,
 *   files: number,
 *   chunks: number,
 *   memories: number,
 *   browserData: number,
 *   dbPath: string
 * }
 */

import { NextResponse } from 'next/server';
import { getCliStats } from '@/lib/cli-db';

export const dynamic = 'force-dynamic'; // No cache — always fresh

export async function GET() {
  try {
    const stats = await getCliStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        exists: false,
        error: (err as Error).message,
        notes: 0,
        files: 0,
        chunks: 0,
        memories: 0,
        browserData: 0,
      },
      { status: 500 },
    );
  }
}
