/**
 * Retry Strategy for AI Calls
 *
 * Provides exponential backoff with configurable parameters.
 * Pure functions for easy testing.
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retries (0 = no retries) */
  maxRetries: number;
  /** Initial delay in ms before first retry */
  initialDelayMs: number;
  /** Maximum delay between retries (cap) */
  maxDelayMs: number;
  /** Multiplier for each subsequent retry */
  multiplier: number;
}

/**
 * Default configuration matching production values
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  multiplier: 2,
};

/**
 * Calculate exponential backoff delay for a given attempt.
 *
 * Uses the formula: delay = initialDelay * (multiplier ^ attempt)
 * Capped at maxDelay.
 *
 * @param attempt - 0-indexed attempt number
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * // With default config (initial: 100ms, multiplier: 2, max: 5000ms)
 * calculateBackoff(0, config) // 100ms
 * calculateBackoff(1, config) // 200ms
 * calculateBackoff(2, config) // 400ms
 * calculateBackoff(10, config) // 5000ms (capped)
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.multiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if another retry should be attempted.
 *
 * @param attempt - Current 0-indexed attempt number
 * @param config - Retry configuration
 * @returns true if retry is allowed
 *
 * @example
 * // With maxRetries: 2
 * shouldRetry(0, config) // true (can retry)
 * shouldRetry(1, config) // true (can retry)
 * shouldRetry(2, config) // false (exceeded)
 */
export function shouldRetry(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return attempt < config.maxRetries;
}

/**
 * Sleep for the specified duration.
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retries and exponential backoff.
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @param shouldRetryError - Optional predicate to check if error is retryable
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 *
 * @example
 * const result = await withRetry(
 *   () => callAI(),
 *   { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, multiplier: 2 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  shouldRetryError: (error: unknown) => boolean = () => true
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetryError(error)) {
        throw error;
      }

      // Check if we have retries left
      if (!shouldRetry(attempt, config)) {
        throw error;
      }

      // Wait before retrying
      const delay = calculateBackoff(attempt, config);
      await sleep(delay);
    }
  }

  // Should not reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Check if an error is a transient error that should be retried.
 *
 * Common transient errors:
 * - Rate limiting (429)
 * - Server errors (5xx)
 * - Network timeouts
 *
 * @param error - Error to check
 * @returns true if the error is transient
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Server errors
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return true;
    }

    // Network errors
    if (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound')
    ) {
      return true;
    }
  }

  return false;
}
