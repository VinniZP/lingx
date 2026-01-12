/**
 * Session Cache Service
 *
 * Redis caching layer for session validation.
 * Reduces database load by caching session validity with TTL matching session expiry.
 */
import type { Redis } from 'ioredis';
import { SESSION_EXPIRY_HOURS } from './session.repository.js';

/** Cache key prefix for session validity */
const SESSION_CACHE_PREFIX = 'session:valid:';

/** Cache key prefix for user sessions (for bulk invalidation) */
const USER_SESSIONS_PREFIX = 'user:sessions:';

/** Default cache TTL in seconds (matches session expiry) */
const DEFAULT_TTL_SECONDS = SESSION_EXPIRY_HOURS * 60 * 60;

export class SessionCacheService {
  constructor(private readonly redis: Redis) {}

  /**
   * Get the cache key for a session.
   */
  private getSessionKey(sessionId: string): string {
    return `${SESSION_CACHE_PREFIX}${sessionId}`;
  }

  /**
   * Get the cache key for a user's session set.
   */
  private getUserSessionsKey(userId: string): string {
    return `${USER_SESSIONS_PREFIX}${userId}`;
  }

  /**
   * Cache that a session is valid.
   * Stores session ID in user's session set for bulk invalidation.
   */
  async setValid(sessionId: string, userId: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const sessionKey = this.getSessionKey(sessionId);
    const userSessionsKey = this.getUserSessionsKey(userId);

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.set(sessionKey, userId, 'EX', ttl);
    pipeline.sadd(userSessionsKey, sessionId);
    pipeline.expire(userSessionsKey, ttl);
    await pipeline.exec();
  }

  /**
   * Check if a session is cached as valid.
   * Returns the userId if valid, null otherwise.
   */
  async isValid(sessionId: string): Promise<string | null> {
    const sessionKey = this.getSessionKey(sessionId);
    return this.redis.get(sessionKey);
  }

  /**
   * Invalidate a specific session.
   */
  async invalidate(sessionId: string): Promise<void> {
    const sessionKey = this.getSessionKey(sessionId);

    // Get userId before deleting to clean up user's session set
    const userId = await this.redis.get(sessionKey);
    if (userId) {
      const userSessionsKey = this.getUserSessionsKey(userId);
      await this.redis.pipeline().del(sessionKey).srem(userSessionsKey, sessionId).exec();
    } else {
      await this.redis.del(sessionKey);
    }
  }

  /**
   * Invalidate all sessions for a user.
   * Used when password changes or all sessions are revoked.
   */
  async invalidateAllForUser(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);

    // Get all session IDs for this user
    const sessionIds = await this.redis.smembers(userSessionsKey);
    if (sessionIds.length === 0) {
      return;
    }

    // Delete all session keys and the user's session set
    const sessionKeys = sessionIds.map((id) => this.getSessionKey(id));
    await this.redis.del(...sessionKeys, userSessionsKey);
  }

  /**
   * Invalidate all sessions for a user except one.
   * Used when password changes (keep current session valid).
   */
  async invalidateAllExcept(userId: string, exceptSessionId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);

    // Get all session IDs for this user
    const sessionIds = await this.redis.smembers(userSessionsKey);
    const toDelete = sessionIds.filter((id) => id !== exceptSessionId);

    if (toDelete.length === 0) {
      return;
    }

    // Delete all other session keys and remove from user's set
    const pipeline = this.redis.pipeline();
    for (const sessionId of toDelete) {
      pipeline.del(this.getSessionKey(sessionId));
      pipeline.srem(userSessionsKey, sessionId);
    }
    await pipeline.exec();
  }
}
