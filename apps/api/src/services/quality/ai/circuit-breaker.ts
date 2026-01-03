/**
 * Circuit Breaker for AI Calls
 *
 * Prevents cascading failures and cost explosion when AI providers are down.
 * State machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 *
 * - CLOSED: Normal operation, all calls allowed
 * - OPEN: Too many failures, calls blocked for openDurationMs
 * - HALF_OPEN: After open duration, allows one call to test recovery
 */

/**
 * Configuration for circuit breaker behavior
 */
export interface CircuitBreakerConfig {
  /** Maximum consecutive failures before circuit opens */
  failureThreshold: number;
  /** Time window in ms to reset failure count */
  resetTimeoutMs: number;
  /** How long circuit stays open before allowing retry */
  openDurationMs: number;
}

/**
 * Default configuration matching production values
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 5 * 60 * 1000, // 5 minutes
  openDurationMs: 30 * 1000, // 30 seconds
};

/**
 * Internal state for the circuit breaker
 */
interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
  openedAt: number;
}

/**
 * Circuit Breaker implementation
 *
 * Injectable, testable class with configurable thresholds.
 * Replaces the global mutable state in the original implementation.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({ failureThreshold: 3, ... });
 *
 * if (breaker.isOpen()) {
 *   throw new Error('Circuit is open, AI calls blocked');
 * }
 *
 * try {
 *   const result = await callAI();
 *   breaker.recordSuccess();
 *   return result;
 * } catch (error) {
 *   breaker.recordFailure();
 *   throw error;
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): CircuitBreakerState {
    return {
      failureCount: 0,
      lastFailureTime: 0,
      isOpen: false,
      openedAt: 0,
    };
  }

  /**
   * Check if circuit breaker allows AI calls.
   *
   * @returns true if call is allowed, false if circuit is open
   */
  isOpen(): boolean {
    const now = Date.now();

    // Check if failure count should be reset (window expired)
    if (now - this.state.lastFailureTime > this.config.resetTimeoutMs) {
      this.state.failureCount = 0;
    }

    // Check if circuit is open
    if (this.state.isOpen) {
      // Check if it's time to try again (half-open state)
      if (now - this.state.openedAt > this.config.openDurationMs) {
        console.log('[CircuitBreaker] Transitioning to half-open state');
        this.state.isOpen = false;
        return false; // Allow the call
      }
      return true; // Circuit still open
    }

    return false; // Circuit closed, allow call
  }

  /**
   * Check if a call should be allowed (inverse of isOpen for clarity)
   */
  canAttempt(): boolean {
    return !this.isOpen();
  }

  /**
   * Record a failure in the circuit breaker.
   * Opens the circuit if failure threshold is reached.
   */
  recordFailure(): void {
    const now = Date.now();
    this.state.failureCount++;
    this.state.lastFailureTime = now;

    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.isOpen = true;
      this.state.openedAt = now;
      console.warn(
        `[CircuitBreaker] OPEN: ${this.state.failureCount} failures in window. ` +
        `Blocking AI calls for ${this.config.openDurationMs / 1000}s`
      );
    }
  }

  /**
   * Record a success in the circuit breaker.
   * Resets the failure count and closes the circuit.
   */
  recordSuccess(): void {
    this.state.failureCount = 0;
    this.state.isOpen = false;
  }

  /**
   * Reset the circuit breaker to initial state.
   * Useful for testing.
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Get current state for debugging/monitoring.
   * Returns a copy to prevent external mutation.
   */
  getState(): Readonly<CircuitBreakerState> {
    return { ...this.state };
  }

  /**
   * Get the failure count for monitoring.
   */
  getFailureCount(): number {
    return this.state.failureCount;
  }

  /**
   * Get remaining time until circuit closes (for monitoring).
   * Returns 0 if circuit is not open.
   */
  getRemainingOpenTime(): number {
    if (!this.state.isOpen) return 0;
    const elapsed = Date.now() - this.state.openedAt;
    return Math.max(0, this.config.openDurationMs - elapsed);
  }
}
