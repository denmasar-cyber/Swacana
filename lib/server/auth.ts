/**
 * SWACANA v2 — Server-side Authentication
 *
 * Simple, secure auth: password-based login → JWT token
 * API keys for programmatic access (CLI, integrations)
 * Session tracking for security
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from './db';
import { cookies } from 'next/headers';

// ─── Config ─────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const API_KEY_PREFIX = 'sk_';
const BCRYPT_ROUNDS = 12;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;      // userId
  email: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// ─── Password ───────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ────────────────────────────────────────────────────────────────────

export function signToken(payload: { sub: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
    issuer: 'swacana',
    audience: 'swacana-web',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'swacana',
      audience: 'swacana-web',
    }) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Registration ───────────────────────────────────────────────────────────

export interface RegisterResult {
  user: AuthUser;
  token: string;
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<RegisterResult> {
  // Check existing
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  // Validate
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!email.includes('@') || !email.includes('.')) {
    throw new Error('Invalid email address');
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
    },
  });

  // Generate token
  const token = signToken({ sub: user.id, email: user.email });

  // Store session
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt,
    },
  });

  // Generate default API key
  const apiKey = generateApiKey();
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      keyHash,
      label: 'default',
      scopes: ['read', 'write', 'ai'],
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    token,
  };
}

// ─── Login ──────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<RegisterResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = signToken({ sub: user.id, email: user.email });

  // Store session
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    token,
  };
}

// ─── API Keys ───────────────────────────────────────────────────────────────

function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString('hex');
  return `${API_KEY_PREFIX}${random}`;
}

export async function createApiKey(
  userId: string,
  label: string,
  scopes: string[] = ['read', 'write', 'ai'],
): Promise<string> {
  const apiKey = generateApiKey();
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  await prisma.apiKey.create({
    data: {
      userId,
      keyHash,
      label,
      scopes,
    },
  });

  return apiKey; // Return raw key — only time it's shown
}

export async function validateApiKey(rawKey: string): Promise<AuthUser | null> {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  });

  return {
    id: apiKey.user.id,
    email: apiKey.user.email,
    displayName: apiKey.user.displayName,
    avatarUrl: apiKey.user.avatarUrl,
  };
}

export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  await prisma.apiKey.deleteMany({
    where: { id: keyId, userId },
  });
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      scopes: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Request Authentication ─────────────────────────────────────────────────

/**
 * Extract and validate auth from a Request object.
 * Supports both Bearer token (JWT) and API key (x-api-key header).
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthUser | null> {
  // 1. Try API key header
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return validateApiKey(apiKey);
  }

  // 2. Try Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        };
      }
    }
  }

  return null;
}

/**
 * Helper: require auth or throw.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await authenticateRequest(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// ─── Cookie-based session (for web) ────────────────────────────────────────

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set('swacana-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete('swacana-token');
}

export async function getUserFromCookie(): Promise<AuthUser | null> {
  try {
    const store = await cookies();
    const token = store.get('swacana-token')?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  } catch {
    return null;
  }
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logout(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.session.deleteMany({ where: { token: tokenHash } });
}
