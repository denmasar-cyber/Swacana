/**
 * SWACANA v2 — Next.js Middleware
 *
 * Enforces authentication on all /api/v2/* and /api/auth routes.
 * The old /api/notes, /api/files, /api/stats routes remain public (read-only bridge).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/api/v2/:path*', '/api/auth'],
};

export function middleware(request: NextRequest) {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  const tokenCookie = request.cookies.get('swacana-token')?.value;

  const hasAuth = !!authHeader || !!apiKeyHeader || !!tokenCookie;

  if (!hasAuth) {
    return NextResponse.json(
      { error: 'Authentication required. Provide Authorization: Bearer <token> or x-api-key header.' },
      { status: 401 },
    );
  }

  return NextResponse.next();
}
