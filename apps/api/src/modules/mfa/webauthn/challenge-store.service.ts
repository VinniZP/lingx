/**
 * ChallengeStore Service
 *
 * Manages WebAuthn challenge storage in Redis.
 * Provides secure, temporary storage for authentication challenges.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

/** Challenge TTL in seconds (5 minutes) */
const CHALLENGE_TTL = 300;

/** Redis key prefix for challenges */
const CHALLENGE_PREFIX = 'webauthn:challenge:';

export interface StoredChallenge {
  challenge: string;
  purpose: 'webauthn-register' | 'webauthn-auth';
  userId?: string;
}

export class ChallengeStore {
  constructor(
    private readonly redis: Redis,
    private readonly logger: FastifyBaseLogger
  ) {}

  /**
   * Store a challenge with associated metadata
   * @param token - Unique token (typically JWT) to identify this challenge
   * @param data - Challenge data to store
   */
  async store(token: string, data: StoredChallenge): Promise<void> {
    const key = `${CHALLENGE_PREFIX}${token}`;
    await this.redis.set(key, JSON.stringify(data), 'EX', CHALLENGE_TTL);
  }

  /**
   * Retrieve and delete a challenge (single use)
   * @param token - Token used when storing the challenge
   * @returns Challenge data or null if not found/expired
   */
  async consume(token: string): Promise<StoredChallenge | null> {
    const key = `${CHALLENGE_PREFIX}${token}`;
    const tokenPrefix = token.slice(0, 8);

    // Get and delete atomically using a transaction
    const results = await this.redis.multi().get(key).del(key).exec();

    if (!results) {
      this.logger.error({ tokenPrefix }, 'Redis transaction returned null results');
      return null;
    }

    // Check for Redis transaction errors
    const [getResult, delResult] = results;
    if (getResult[0] !== null) {
      this.logger.error(
        { tokenPrefix, error: getResult[0] },
        'Redis GET command failed in transaction'
      );
      return null;
    }
    if (delResult[0] !== null) {
      this.logger.warn(
        { tokenPrefix, error: delResult[0] },
        'Redis DEL command failed in transaction'
      );
      // Continue anyway since we got the data
    }

    const data = getResult[1];
    if (!data || typeof data !== 'string') {
      // Not found or expired - this is normal, not an error
      return null;
    }

    try {
      return JSON.parse(data) as StoredChallenge;
    } catch (error) {
      this.logger.error(
        { tokenPrefix, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to parse challenge data from Redis'
      );
      return null;
    }
  }

  /**
   * Check if a challenge exists without consuming it
   * @param token - Token to check
   */
  async exists(token: string): Promise<boolean> {
    const key = `${CHALLENGE_PREFIX}${token}`;
    return (await this.redis.exists(key)) === 1;
  }

  /**
   * Delete a challenge manually
   * @param token - Token to delete
   */
  async delete(token: string): Promise<void> {
    const key = `${CHALLENGE_PREFIX}${token}`;
    await this.redis.del(key);
  }
}
