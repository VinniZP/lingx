/**
 * Prisma Test Helper
 *
 * Provides a configured PrismaClient for integration tests.
 * Uses the adapter pattern required by Prisma 7.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let pool: Pool | null = null;
let prisma: PrismaClient | null = null;

/**
 * Get a configured PrismaClient for tests.
 *
 * Uses TEST_DATABASE_URL and proper adapter configuration.
 * Reuses the same client instance across tests for efficiency.
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set');
    }

    pool = new Pool({
      connectionString,
      max: 5,
    });

    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}

/**
 * Disconnect the test Prisma client.
 *
 * Call this in afterAll or teardown to clean up connections.
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}
