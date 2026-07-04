/**
 * GET /api/files
 *
 * Returns all indexed files from the SWACANA CLI's SQLite database.
 * These are files indexed by `swacana scan`.
 *
 * Response: CliFile[]
 */

import { NextResponse } from 'next/server';
import { getCliFiles } from '@/lib/cli-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const files = await getCliFiles();
    return NextResponse.json(files, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, files: [] },
      { status: 500 },
    );
  }
}
