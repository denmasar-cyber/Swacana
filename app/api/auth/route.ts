/**
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 * POST /api/auth/api-keys
 * GET  /api/auth/api-keys
 * DELETE /api/auth/api-keys/:id
 */

import { NextResponse } from 'next/server';
import {
  register,
  login,
  logout,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// ─── Register ───────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      const { email, password, displayName } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }

      const result = await register(email, password, displayName);
      await setSessionCookie(result.token);

      return NextResponse.json({
        user: result.user,
        token: result.token,
      }, { status: 201 });
    }

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }

      const result = await login(email, password);
      await setSessionCookie(result.token);

      return NextResponse.json({
        user: result.user,
        token: result.token,
      });
    }

    if (action === 'logout') {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (token) await logout(token);
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    if (action === 'create-api-key') {
      const user = await requireAuth(request);
      const { label, scopes } = body;
      const key = await createApiKey(user.id, label || 'default', scopes);
      return NextResponse.json({ apiKey: key, label: label || 'default' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Unauthorized' ? 401
      : message.includes('already registered') ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── Get Current User ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const apiKeys = await listApiKeys(user.id);
    return NextResponse.json({ user, apiKeys });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Delete API Key ─────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }
    await revokeApiKey(keyId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
