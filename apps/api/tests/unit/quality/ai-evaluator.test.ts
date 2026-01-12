/**
 * AI Evaluator Unit Tests
 *
 * Tests AI-powered translation quality evaluation including
 * retry logic, circuit breaker integration, and multi-language batching.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../../../src/modules/quality-estimation/quality/ai/circuit-breaker.js';
import {
  AIEvaluator,
  type AIModelConfig,
} from '../../../src/modules/quality-estimation/quality/evaluators/ai-evaluator.js';
import {
  MOCK_MQM_RESPONSE,
  MOCK_MQM_RESPONSE_WITH_ISSUES,
  createCacheHitMetrics,
  createMockMultiLanguageResponse,
  wrapInMarkdown,
} from '../../mocks/ai-providers.js';

// Mock the 'ai' module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';

const mockGenerateText = generateText as ReturnType<typeof vi.fn>;

// ============================================
// Test Setup
// ============================================

describe('AIEvaluator', () => {
  let circuitBreaker: CircuitBreaker;
  let evaluator: AIEvaluator;
  let mockConfig: AIModelConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3 });
    evaluator = new AIEvaluator(circuitBreaker);
    mockConfig = {
      model: {} as AIModelConfig['model'], // Not used since we mock generateText
      isAnthropic: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // evaluateSingle
  // ============================================

  describe('evaluateSingle', () => {
    it('should return evaluation result on success', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: MOCK_MQM_RESPONSE,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      const result = await evaluator.evaluateSingle(
        'greeting.hello',
        'Hello',
        'Hola',
        'en',
        'es',
        [],
        mockConfig
      );

      expect(result.accuracy).toBe(95);
      expect(result.fluency).toBe(90);
      expect(result.terminology).toBe(85);
      expect(result.issues).toEqual([]);
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(50);
    });

    it('should extract JSON from markdown code blocks', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: wrapInMarkdown(MOCK_MQM_RESPONSE),
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      const result = await evaluator.evaluateSingle(
        'key',
        'source',
        'target',
        'en',
        'de',
        [],
        mockConfig
      );

      expect(result.accuracy).toBe(95);
    });

    it('should return issues from AI response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: MOCK_MQM_RESPONSE_WITH_ISSUES,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      const result = await evaluator.evaluateSingle(
        'key',
        'source',
        'target',
        'en',
        'de',
        [],
        mockConfig
      );

      expect(result.accuracy).toBe(70);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0]).toEqual({
        type: 'accuracy',
        severity: 'major',
        message: 'Some meaning was lost in translation',
      });
    });

    it('should extract Anthropic cache metrics', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: MOCK_MQM_RESPONSE,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: {
          anthropic: createCacheHitMetrics(500),
        },
      });

      const result = await evaluator.evaluateSingle('key', 'source', 'target', 'en', 'de', [], {
        ...mockConfig,
        isAnthropic: true,
      });

      expect(result.cacheMetrics.cacheRead).toBe(500);
      expect(result.cacheMetrics.cacheCreation).toBe(0);
    });

    it('should retry on invalid JSON', async () => {
      // First call returns invalid JSON, second succeeds
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Not valid JSON {{{',
          usage: { inputTokens: 50, outputTokens: 25 },
          providerMetadata: undefined,
        })
        .mockResolvedValueOnce({
          text: MOCK_MQM_RESPONSE,
          usage: { inputTokens: 100, outputTokens: 50 },
          providerMetadata: undefined,
        });

      const result = await evaluator.evaluateSingle(
        'key',
        'source',
        'target',
        'en',
        'de',
        [],
        mockConfig
      );

      expect(result.accuracy).toBe(95);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries with invalid JSON', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Not valid JSON at all',
        usage: { inputTokens: 50, outputTokens: 25 },
        providerMetadata: undefined,
      });

      await expect(
        evaluator.evaluateSingle('key', 'source', 'target', 'en', 'de', [], mockConfig)
      ).rejects.toThrow('Failed to get valid JSON after 3 attempts');

      expect(mockGenerateText).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should include related keys in prompt', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: MOCK_MQM_RESPONSE,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      await evaluator.evaluateSingle(
        'greeting.hello',
        'Hello',
        'Hola',
        'en',
        'es',
        [
          { key: 'greeting.bye', source: 'Goodbye', target: 'Adios' },
          { key: 'greeting.thanks', source: 'Thank you', target: 'Gracias' },
        ],
        mockConfig
      );

      // Verify the prompt includes related keys
      const callArgs = mockGenerateText.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('greeting.bye');
      expect(userMessage.content).toContain('Goodbye');
      expect(userMessage.content).toContain('Adios');
    });
  });

  // ============================================
  // evaluateMultiLanguage
  // ============================================

  describe('evaluateMultiLanguage', () => {
    it('should return results for all languages', async () => {
      const multiLangResponse = createMockMultiLanguageResponse(['de', 'fr', 'es']);
      mockGenerateText.mockResolvedValueOnce({
        text: multiLangResponse,
        usage: { inputTokens: 300, outputTokens: 150 },
        providerMetadata: undefined,
      });

      const result = await evaluator.evaluateMultiLanguage(
        'greeting.hello',
        'Hello',
        'en',
        [
          { language: 'de', value: 'Hallo' },
          { language: 'fr', value: 'Bonjour' },
          { language: 'es', value: 'Hola' },
        ],
        [],
        mockConfig
      );

      expect(result.size).toBe(3);
      expect(result.has('de')).toBe(true);
      expect(result.has('fr')).toBe(true);
      expect(result.has('es')).toBe(true);

      // Check score distribution
      const deResult = result.get('de')!;
      expect(deResult.accuracy).toBe(90);
      expect(deResult.fluency).toBe(85);
      expect(deResult.terminology).toBe(80);

      // Token usage should be distributed
      expect(deResult.usage.inputTokens).toBe(100);
      expect(deResult.usage.outputTokens).toBe(50);
    });

    it('should check circuit breaker before attempting', async () => {
      // Open the circuit breaker
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }

      await expect(
        evaluator.evaluateMultiLanguage(
          'key',
          'source',
          'en',
          [{ language: 'de', value: 'target' }],
          [],
          mockConfig
        )
      ).rejects.toThrow('Circuit breaker is open');

      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should record success in circuit breaker', async () => {
      const multiLangResponse = createMockMultiLanguageResponse(['de']);
      mockGenerateText.mockResolvedValueOnce({
        text: multiLangResponse,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      await evaluator.evaluateMultiLanguage(
        'key',
        'source',
        'en',
        [{ language: 'de', value: 'target' }],
        [],
        mockConfig
      );

      // After success, circuit breaker should be healthy
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should use conversation retry on JSON errors', async () => {
      // First call returns invalid JSON, second succeeds
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Invalid JSON {{{',
          usage: { inputTokens: 50, outputTokens: 25 },
          providerMetadata: undefined,
        })
        .mockResolvedValueOnce({
          text: createMockMultiLanguageResponse(['de']),
          usage: { inputTokens: 100, outputTokens: 50 },
          providerMetadata: undefined,
        });

      const result = await evaluator.evaluateMultiLanguage(
        'key',
        'source',
        'en',
        [{ language: 'de', value: 'target' }],
        [],
        mockConfig
      );

      expect(result.size).toBe(1);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);

      // Second call should include error feedback
      const secondCall = mockGenerateText.mock.calls[1][0];
      const messages = secondCall.messages;
      expect(messages.length).toBeGreaterThan(2); // system + user + assistant + error feedback
    });

    it('should record failure after exhausting retries', async () => {
      // Create evaluator with minimal delays for testing
      const fastEvaluator = new AIEvaluator(circuitBreaker, {
        maxRetries: 3,
        initialDelayMs: 1, // 1ms instead of 100ms
        maxDelayMs: 5,
        multiplier: 1.1,
      });

      // Always return invalid JSON
      mockGenerateText.mockResolvedValue({
        text: 'Invalid JSON forever',
        usage: { inputTokens: 50, outputTokens: 25 },
        providerMetadata: undefined,
      });

      await expect(
        fastEvaluator.evaluateMultiLanguage(
          'key',
          'source',
          'en',
          [{ language: 'de', value: 'target' }],
          [],
          mockConfig
        )
      ).rejects.toThrow('Failed after');

      // Circuit breaker should have recorded a failure
      expect(circuitBreaker.getFailureCount()).toBe(1);
    }, 30000); // Allow 30s for this test

    it('should accumulate cache metrics across turns', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: createMockMultiLanguageResponse(['de']),
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: {
          anthropic: { cacheReadInputTokens: 500, cacheCreationInputTokens: 0 },
        },
      });

      const result = await evaluator.evaluateMultiLanguage(
        'key',
        'source',
        'en',
        [{ language: 'de', value: 'target' }],
        [],
        { ...mockConfig, isAnthropic: true }
      );

      const deResult = result.get('de')!;
      expect(deResult.cacheMetrics.cacheRead).toBe(500);
    });

    it('should include related keys with all languages', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: createMockMultiLanguageResponse(['de', 'fr']),
        usage: { inputTokens: 200, outputTokens: 100 },
        providerMetadata: undefined,
      });

      await evaluator.evaluateMultiLanguage(
        'greeting.hello',
        'Hello',
        'en',
        [
          { language: 'de', value: 'Hallo' },
          { language: 'fr', value: 'Bonjour' },
        ],
        [
          {
            keyName: 'greeting.bye',
            source: 'Goodbye',
            translations: { de: 'Tschüss', fr: 'Au revoir' },
          },
        ],
        mockConfig
      );

      const callArgs = mockGenerateText.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('greeting.bye');
      expect(userMessage.content).toContain('Tschüss');
      expect(userMessage.content).toContain('Au revoir');
    });
  });

  // ============================================
  // Circuit Breaker Delegation
  // ============================================

  describe('circuit breaker delegation', () => {
    it('should delegate canAttempt to circuit breaker', () => {
      expect(evaluator.canAttempt()).toBe(true);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }

      expect(evaluator.canAttempt()).toBe(false);
    });

    it('should delegate getRemainingOpenTime to circuit breaker', () => {
      expect(evaluator.getRemainingOpenTime()).toBe(0);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }

      expect(evaluator.getRemainingOpenTime()).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Anthropic Cache Control
  // ============================================

  describe('Anthropic cache control', () => {
    it('should add cacheControl to system message for Anthropic', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: MOCK_MQM_RESPONSE,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      await evaluator.evaluateSingle('key', 'source', 'target', 'en', 'de', [], {
        ...mockConfig,
        isAnthropic: true,
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMessage.providerOptions).toEqual({
        anthropic: { cacheControl: { type: 'ephemeral' } },
      });
    });

    it('should not add cacheControl for non-Anthropic providers', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: MOCK_MQM_RESPONSE,
        usage: { inputTokens: 100, outputTokens: 50 },
        providerMetadata: undefined,
      });

      await evaluator.evaluateSingle('key', 'source', 'target', 'en', 'de', [], {
        ...mockConfig,
        isAnthropic: false,
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMessage.providerOptions).toBeUndefined();
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  describe('error handling', () => {
    it('should throw on no JSON in response', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'This response has no JSON at all',
        usage: { inputTokens: 50, outputTokens: 25 },
        providerMetadata: undefined,
      });

      await expect(
        evaluator.evaluateSingle('key', 'source', 'target', 'en', 'de', [], mockConfig)
      ).rejects.toThrow('Failed to get valid JSON');
    });

    it('should throw on invalid MQM structure', async () => {
      mockGenerateText.mockResolvedValue({
        text: '{"invalid": "structure"}',
        usage: { inputTokens: 50, outputTokens: 25 },
        providerMetadata: undefined,
      });

      await expect(
        evaluator.evaluateSingle('key', 'source', 'target', 'en', 'de', [], mockConfig)
      ).rejects.toThrow('Failed to get valid JSON');
    });
  });
});
