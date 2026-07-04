/**
 * GET /api/notes
 *
 * Returns all notes from the SWACANA CLI's SQLite database.
 * These are notes created by `swacana agent` or the AI agent.
 *
 * Response: CliNote[]
 */

import { NextResponse } from 'next/server';
import { getCliNotes } from '@/lib/cli-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notes = await getCliNotes();
    return NextResponse.json(notes, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, notes: [] },
      { status: 500 },
    );
  }
}
