/**
 * Prisma Client Utility for Localeflow API
 *
 * Uses Prisma 7 adapter-based initialization with @prisma/adapter-pg.
 * Implements singleton pattern to prevent multiple client instances
 * during development hot reloading.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Declare global type for development singleton
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Create a new PrismaClient instance with PostgreSQL adapter
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

/**
 * Singleton PrismaClient instance
 *
 * In development, attaches to global object to prevent
 * multiple instances during hot module replacement (HMR).
 * In production, creates a single instance per process.
 */
export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
