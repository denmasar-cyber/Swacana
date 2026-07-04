/**
 * SWACANA v2 — Server-side Prisma Client
 *
 * Prisma 7.x uses driver adapters for database connections.
 * Uses @prisma/adapter-pg for PostgreSQL connection.
 * If DATABASE_URL is not set, queries fail at runtime with a
 * clear connection error — which is correct until PostgreSQL
 * is deployed.
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[db] DATABASE_URL not set — v2 API routes will return connection errors.');
  }

  const adapter = new PrismaPg({ connectionString: url || 'postgresql://localhost:5432/swacana' });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
