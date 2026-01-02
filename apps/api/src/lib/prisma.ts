/**
 * Prisma Client Utility for Lingx API
 *
 * Uses Prisma 7 adapter-based initialization with @prisma/adapter-pg.
 * Implements singleton pattern to prevent multiple client instances
 * during development hot reloading.
 *
 * For tests, uses TEST_DATABASE_URL to isolate test data.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Declare global type for development singleton
declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaPool: Pool | undefined;
}

/**
 * Get the appropriate database URL based on environment
 */
function getDatabaseUrl(): string {
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest) {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) {
      throw new Error(
        'TEST_DATABASE_URL environment variable is not set. ' +
          'Please set it to run tests with an isolated database.'
      );
    }
    return testUrl;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return url;
}

/**
 * Create a new PrismaClient instance with PostgreSQL adapter
 */
function createPrismaClient(): PrismaClient {
  const connectionString = getDatabaseUrl();
  const isTest = process.env.NODE_ENV === 'test';

  const pool = new Pool({
    connectionString,
    // Limit connections in test environment
    max: isTest ? 5 : 10,
  });

  // Store pool reference for cleanup
  globalThis.__prismaPool = pool;

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

/**
 * Disconnect Prisma client and close the connection pool.
 * Used for test cleanup.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  if (globalThis.__prismaPool) {
    await globalThis.__prismaPool.end();
    globalThis.__prismaPool = undefined;
  }
  globalThis.__prisma = undefined;
}

/**
 * Reset test database by truncating all tables.
 * Only works in test environment.
 */
export async function resetTestDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetTestDatabase can only be called in test environment');
  }

  // Truncate all tables in correct order (respecting foreign keys)
  await prisma.$transaction([
    prisma.activityChange.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.translation.deleteMany(),
    prisma.translationKey.deleteMany(),
    prisma.environment.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.space.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export default prisma;
