/**
 * Redis Client for Lingx API
 *
 * Used by BullMQ for job queues and optional caching.
 * Implements singleton pattern for connection reuse.
 */
import { Redis } from 'ioredis';

// Declare global type for development singleton
declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

/**
 * Create a new Redis client instance
 */
function createRedisClient(): Redis {
  // Use separate Redis database for tests (db 1) to isolate from development (db 0)
  const isTest = process.env.NODE_ENV === 'test';
  const redisUrl = isTest
    ? process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
    : process.env.REDIS_URL || 'redis://localhost:6379/0';

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  return client;
}

/**
 * Singleton Redis instance
 *
 * In development, attaches to global object to prevent
 * multiple connections during hot module replacement.
 */
export const redis: Redis = globalThis.__redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__redis = redis;
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
