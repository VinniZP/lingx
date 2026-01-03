/**
 * Circuit Breaker Unit Tests
 *
 * Tests the state machine transitions and timing behavior.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type CircuitBreakerConfig,
} from '../../../src/services/quality/ai/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new CircuitBreaker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start closed (allowing calls)', () => {
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.canAttempt()).toBe(true);
    });

    it('should have zero failure count', () => {
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should have zero remaining open time', () => {
      expect(breaker.getRemainingOpenTime()).toBe(0);
    });
  });

  describe('failure tracking', () => {
    it('should increment failure count on recordFailure', () => {
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(1);
    });

    it('should remain closed below threshold', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;

      for (let i = 0; i < threshold - 1; i++) {
        breaker.recordFailure();
      }

      expect(breaker.isOpen()).toBe(false);
      expect(breaker.canAttempt()).toBe(true);
      expect(breaker.getFailureCount()).toBe(threshold - 1);
    });

    it('should open at failure threshold', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;

      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      expect(breaker.isOpen()).toBe(true);
      expect(breaker.canAttempt()).toBe(false);
    });
  });

  describe('success handling', () => {
    it('should reset failure count on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should prevent opening after success resets count', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;

      // Almost reach threshold
      for (let i = 0; i < threshold - 1; i++) {
        breaker.recordFailure();
      }

      // Success resets count
      breaker.recordSuccess();

      // One more failure shouldn't open
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(false);
    });
  });

  describe('open state timing', () => {
    it('should block calls when open', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;

      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      expect(breaker.isOpen()).toBe(true);
      expect(breaker.canAttempt()).toBe(false);
    });

    it('should report remaining open time', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      const openDuration = DEFAULT_CIRCUIT_BREAKER_CONFIG.openDurationMs;

      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      // Should be close to full duration
      const remaining = breaker.getRemainingOpenTime();
      expect(remaining).toBeLessThanOrEqual(openDuration);
      expect(remaining).toBeGreaterThan(openDuration - 100); // Allow 100ms margin
    });

    it('should transition to half-open after openDurationMs', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      const openDuration = DEFAULT_CIRCUIT_BREAKER_CONFIG.openDurationMs;

      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }
      expect(breaker.isOpen()).toBe(true);

      // Advance time past open duration
      vi.advanceTimersByTime(openDuration + 1);

      // Should transition to half-open (allows one call)
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.canAttempt()).toBe(true);
    });

    it('should remain open before openDurationMs expires', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      const openDuration = DEFAULT_CIRCUIT_BREAKER_CONFIG.openDurationMs;

      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      // Advance time but not past open duration
      vi.advanceTimersByTime(openDuration - 1000);

      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe('failure count timeout', () => {
    it('should reset failure count after resetTimeoutMs', () => {
      const resetTimeout = DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs;

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);

      // Advance time past reset timeout
      vi.advanceTimersByTime(resetTimeout + 1);

      // Check isOpen to trigger the reset logic
      breaker.isOpen();

      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should not open if failures are spread beyond timeout', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      const resetTimeout = DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs;

      // Record failures with long gaps between them
      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
        if (i < threshold - 1) {
          vi.advanceTimersByTime(resetTimeout + 1);
          breaker.isOpen(); // Trigger reset check
        }
      }

      // Should only have 1 failure (others were reset)
      expect(breaker.getFailureCount()).toBe(1);
      expect(breaker.isOpen()).toBe(false);
    });
  });

  describe('reset method', () => {
    it('should reset all state', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;

      // Open the circuit
      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }
      expect(breaker.isOpen()).toBe(true);

      // Reset
      breaker.reset();

      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getFailureCount()).toBe(0);
      expect(breaker.getRemainingOpenTime()).toBe(0);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom failure threshold', () => {
      const customBreaker = new CircuitBreaker({ failureThreshold: 2 });

      customBreaker.recordFailure();
      expect(customBreaker.isOpen()).toBe(false);

      customBreaker.recordFailure();
      expect(customBreaker.isOpen()).toBe(true);
    });

    it('should respect custom open duration', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 1,
        openDurationMs: 1000, // 1 second
      });

      customBreaker.recordFailure();
      expect(customBreaker.isOpen()).toBe(true);

      vi.advanceTimersByTime(500);
      expect(customBreaker.isOpen()).toBe(true);

      vi.advanceTimersByTime(600);
      expect(customBreaker.isOpen()).toBe(false);
    });

    it('should respect custom reset timeout', () => {
      const customBreaker = new CircuitBreaker({
        resetTimeoutMs: 1000, // 1 second
      });

      customBreaker.recordFailure();
      customBreaker.recordFailure();
      expect(customBreaker.getFailureCount()).toBe(2);

      vi.advanceTimersByTime(1001);
      customBreaker.isOpen(); // Trigger reset check

      expect(customBreaker.getFailureCount()).toBe(0);
    });
  });

  describe('getState method', () => {
    it('should return a copy of the state', () => {
      breaker.recordFailure();
      const state1 = breaker.getState();
      const state2 = breaker.getState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values
    });

    it('should reflect current state accurately', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;

      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      const state = breaker.getState();
      expect(state.failureCount).toBe(threshold);
      expect(state.isOpen).toBe(true);
      expect(state.openedAt).toBeGreaterThan(0);
      expect(state.lastFailureTime).toBeGreaterThan(0);
    });
  });

  describe('half-open state recovery', () => {
    it('should close circuit on success after half-open', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      const openDuration = DEFAULT_CIRCUIT_BREAKER_CONFIG.openDurationMs;

      // Open the circuit
      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      // Wait for half-open
      vi.advanceTimersByTime(openDuration + 1);
      expect(breaker.isOpen()).toBe(false); // Half-open allows call

      // Success should fully close
      breaker.recordSuccess();
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should re-open on failure during half-open', () => {
      const threshold = DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      const openDuration = DEFAULT_CIRCUIT_BREAKER_CONFIG.openDurationMs;

      // Open the circuit
      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      // Wait for half-open
      vi.advanceTimersByTime(openDuration + 1);
      breaker.isOpen(); // Transition to half-open

      // Failure during half-open
      for (let i = 0; i < threshold; i++) {
        breaker.recordFailure();
      }

      expect(breaker.isOpen()).toBe(true);
    });
  });
});
