/**
 * Retry Strategy Unit Tests
 *
 * Tests backoff calculations and retry logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateBackoff,
  shouldRetry,
  sleep,
  withRetry,
  isTransientError,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from '../../../src/services/quality/ai/retry-strategy.js';

describe('calculateBackoff', () => {
  it('should return initial delay for first attempt', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      multiplier: 2,
    };

    expect(calculateBackoff(0, config)).toBe(100);
  });

  it('should double delay with multiplier 2', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      multiplier: 2,
    };

    expect(calculateBackoff(0, config)).toBe(100);
    expect(calculateBackoff(1, config)).toBe(200);
    expect(calculateBackoff(2, config)).toBe(400);
    expect(calculateBackoff(3, config)).toBe(800);
  });

  it('should cap delay at maxDelayMs', () => {
    const config: RetryConfig = {
      maxRetries: 10,
      initialDelayMs: 100,
      maxDelayMs: 500,
      multiplier: 2,
    };

    // 100 * 2^5 = 3200, but capped at 500
    expect(calculateBackoff(5, config)).toBe(500);
    expect(calculateBackoff(10, config)).toBe(500);
  });

  it('should use default config when not provided', () => {
    expect(calculateBackoff(0)).toBe(DEFAULT_RETRY_CONFIG.initialDelayMs);
  });

  it('should handle multiplier of 1 (constant delay)', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      multiplier: 1,
    };

    expect(calculateBackoff(0, config)).toBe(100);
    expect(calculateBackoff(5, config)).toBe(100);
  });

  it('should handle fractional multipliers', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      multiplier: 1.5,
    };

    expect(calculateBackoff(0, config)).toBe(100);
    expect(calculateBackoff(1, config)).toBe(150);
    expect(calculateBackoff(2, config)).toBe(225);
  });
});

describe('shouldRetry', () => {
  const config: RetryConfig = {
    maxRetries: 2,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    multiplier: 2,
  };

  it('should return true when attempts are below max', () => {
    expect(shouldRetry(0, config)).toBe(true);
    expect(shouldRetry(1, config)).toBe(true);
  });

  it('should return false when attempts equal max', () => {
    expect(shouldRetry(2, config)).toBe(false);
  });

  it('should return false when attempts exceed max', () => {
    expect(shouldRetry(3, config)).toBe(false);
    expect(shouldRetry(100, config)).toBe(false);
  });

  it('should handle zero max retries', () => {
    const noRetryConfig: RetryConfig = { ...config, maxRetries: 0 };
    expect(shouldRetry(0, noRetryConfig)).toBe(false);
  });

  it('should use default config when not provided', () => {
    expect(shouldRetry(0)).toBe(true);
    expect(shouldRetry(DEFAULT_RETRY_CONFIG.maxRetries)).toBe(false);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after specified time', async () => {
    const promise = sleep(100);

    vi.advanceTimersByTime(99);
    // Promise should not be resolved yet

    vi.advanceTimersByTime(1);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should work with zero delay', async () => {
    const promise = sleep(0);
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const promise = withRetry(fn);
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retries exhausted', async () => {
    vi.useRealTimers(); // Use real timers for this test

    const config: RetryConfig = {
      maxRetries: 2,
      initialDelayMs: 1, // Very short delays for test speed
      maxDelayMs: 10,
      multiplier: 2,
    };

    const fn = vi.fn().mockRejectedValue(new Error('always fail'));

    await expect(withRetry(fn, config)).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries

    vi.useFakeTimers(); // Restore fake timers for other tests
  });

  it('should respect shouldRetryError predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

    const promise = withRetry(fn, DEFAULT_RETRY_CONFIG, () => false);

    await expect(promise).rejects.toThrow('non-retryable');
    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });

  it('should wait with backoff between retries', async () => {
    const config: RetryConfig = {
      maxRetries: 2,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      multiplier: 2,
    };

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const promise = withRetry(fn, config);

    // First call happens immediately
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait for first backoff (100ms)
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Wait for second backoff (200ms)
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe('success');
  });
});

describe('isTransientError', () => {
  it('should return true for rate limit errors', () => {
    expect(isTransientError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isTransientError(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('should return true for server errors', () => {
    expect(isTransientError(new Error('500 Internal Server Error'))).toBe(true);
    expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true);
    expect(isTransientError(new Error('504 Gateway Timeout'))).toBe(true);
  });

  it('should return true for network errors', () => {
    expect(isTransientError(new Error('Connection timeout'))).toBe(true);
    expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
    expect(isTransientError(new Error('ENOTFOUND'))).toBe(true);
  });

  it('should return false for non-transient errors', () => {
    expect(isTransientError(new Error('Invalid API key'))).toBe(false);
    expect(isTransientError(new Error('Bad request'))).toBe(false);
    expect(isTransientError(new Error('Not found'))).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isTransientError('string error')).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
    expect(isTransientError(123)).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isTransientError(new Error('RATE LIMIT'))).toBe(true);
    expect(isTransientError(new Error('Timeout'))).toBe(true);
  });
});
