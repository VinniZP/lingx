/**
 * ChallengeStore Service Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChallengeStore,
  type StoredChallenge,
} from '../../src/services/challenge-store.service.js';

describe('ChallengeStore', () => {
  let mockRedis: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    multi: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  let mockMulti: {
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMulti = {
      get: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    };
    mockRedis = {
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      multi: vi.fn().mockReturnValue(mockMulti),
    };
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
    };
  });

  const createStore = () => new ChallengeStore(mockRedis as any, mockLogger as any);

  // ============================================
  // store() method
  // ============================================

  describe('store', () => {
    it('should store challenge data with TTL', async () => {
      const store = createStore();
      const challengeData: StoredChallenge = {
        challenge: 'test-challenge',
        purpose: 'webauthn-register',
        userId: 'user-123',
      };

      await store.store('test-token', challengeData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'webauthn:challenge:test-token',
        JSON.stringify(challengeData),
        'EX',
        300
      );
    });

    it('should store challenge data without userId', async () => {
      const store = createStore();
      const challengeData: StoredChallenge = {
        challenge: 'test-challenge',
        purpose: 'webauthn-auth',
      };

      await store.store('auth-token', challengeData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'webauthn:challenge:auth-token',
        JSON.stringify(challengeData),
        'EX',
        300
      );
    });
  });

  // ============================================
  // consume() method
  // ============================================

  describe('consume', () => {
    it('should retrieve and delete challenge atomically', async () => {
      const challengeData: StoredChallenge = {
        challenge: 'test-challenge',
        purpose: 'webauthn-register',
        userId: 'user-123',
      };
      mockMulti.exec.mockResolvedValue([
        [null, JSON.stringify(challengeData)], // GET result
        [null, 1], // DEL result
      ]);

      const store = createStore();
      const result = await store.consume('test-token');

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockMulti.get).toHaveBeenCalledWith('webauthn:challenge:test-token');
      expect(mockMulti.del).toHaveBeenCalledWith('webauthn:challenge:test-token');
      expect(result).toEqual(challengeData);
    });

    it('should return null when challenge not found', async () => {
      mockMulti.exec.mockResolvedValue([
        [null, null], // GET result - not found
        [null, 0], // DEL result
      ]);

      const store = createStore();
      const result = await store.consume('unknown-token');

      expect(result).toBeNull();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return null and log error when Redis transaction returns null', async () => {
      mockMulti.exec.mockResolvedValue(null);

      const store = createStore();
      const result = await store.consume('test-token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { tokenPrefix: 'test-tok' },
        'Redis transaction returned null results'
      );
    });

    it('should return null and log error when GET command fails', async () => {
      const redisError = new Error('Redis GET failed');
      mockMulti.exec.mockResolvedValue([
        [redisError, null], // GET result - error
        [null, 0], // DEL result
      ]);

      const store = createStore();
      const result = await store.consume('test-token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { tokenPrefix: 'test-tok', error: redisError },
        'Redis GET command failed in transaction'
      );
    });

    it('should log warning when DEL command fails but still return data', async () => {
      const challengeData: StoredChallenge = {
        challenge: 'test-challenge',
        purpose: 'webauthn-auth',
      };
      const delError = new Error('Redis DEL failed');
      mockMulti.exec.mockResolvedValue([
        [null, JSON.stringify(challengeData)], // GET result - success
        [delError, 0], // DEL result - error
      ]);

      const store = createStore();
      const result = await store.consume('test-token');

      expect(result).toEqual(challengeData);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { tokenPrefix: 'test-tok', error: delError },
        'Redis DEL command failed in transaction'
      );
    });

    it('should return null and log error when JSON parse fails', async () => {
      mockMulti.exec.mockResolvedValue([
        [null, 'invalid-json{'], // GET result - invalid JSON
        [null, 1], // DEL result
      ]);

      const store = createStore();
      const result = await store.consume('test-token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenPrefix: 'test-tok',
          error: expect.stringContaining(''),
        }),
        'Failed to parse challenge data from Redis'
      );
    });

    it('should return null when data is empty string', async () => {
      mockMulti.exec.mockResolvedValue([
        [null, ''], // GET result - empty string
        [null, 1], // DEL result
      ]);

      const store = createStore();
      const result = await store.consume('test-token');

      expect(result).toBeNull();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // exists() method
  // ============================================

  describe('exists', () => {
    it('should return true when challenge exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const store = createStore();
      const result = await store.exists('test-token');

      expect(mockRedis.exists).toHaveBeenCalledWith('webauthn:challenge:test-token');
      expect(result).toBe(true);
    });

    it('should return false when challenge does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const store = createStore();
      const result = await store.exists('unknown-token');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // delete() method
  // ============================================

  describe('delete', () => {
    it('should delete challenge by token', async () => {
      mockRedis.del.mockResolvedValue(1);

      const store = createStore();
      await store.delete('test-token');

      expect(mockRedis.del).toHaveBeenCalledWith('webauthn:challenge:test-token');
    });
  });
});
