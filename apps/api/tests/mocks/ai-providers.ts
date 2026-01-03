/**
 * AI Provider Mocks
 *
 * Mock implementations for testing AI quality evaluation
 * without making actual API calls.
 */

import { vi } from 'vitest';
import type { LanguageModel } from 'ai';

// ============================================
// Types
// ============================================

/**
 * Token usage for AI responses
 */
export interface MockTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Cache metrics from Anthropic responses
 */
export interface MockCacheMetrics {
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/**
 * Configuration for mock AI response
 */
export interface MockAIResponseConfig {
  /** Text response to return */
  text: string;
  /** Token usage (optional, defaults to 100 input / 50 output) */
  usage?: MockTokenUsage;
  /** Anthropic cache metrics (optional) */
  cacheMetrics?: MockCacheMetrics;
  /** Whether this call should fail */
  shouldFail?: boolean;
  /** Error to throw if shouldFail is true */
  error?: Error;
}

// ============================================
// Mock Factory Functions
// ============================================

/**
 * Create a mock language model that returns configured responses.
 *
 * @param responses - Array of response configs (used in order)
 * @returns Mock LanguageModel with doGenerate method
 *
 * @example
 * const model = createMockLanguageModel([
 *   { text: '{"accuracy":95,"fluency":90,"terminology":85,"issues":[]}' }
 * ]);
 */
export function createMockLanguageModel(responses: MockAIResponseConfig[]): LanguageModel {
  let callIndex = 0;

  const mockGenerate = vi.fn().mockImplementation(async () => {
    const config = responses[callIndex] || responses[responses.length - 1];
    callIndex++;

    if (config.shouldFail) {
      throw config.error || new Error('Mock AI error');
    }

    return {
      text: config.text,
      usage: config.usage || { inputTokens: 100, outputTokens: 50 },
      providerMetadata: config.cacheMetrics
        ? { anthropic: config.cacheMetrics }
        : undefined,
    };
  });

  return {
    doGenerate: mockGenerate,
    specificationVersion: 'v1',
    provider: 'mock',
    modelId: 'mock-model',
    defaultObjectGenerationMode: undefined,
  } as unknown as LanguageModel;
}

/**
 * Create a mock language model that always returns the same response.
 *
 * @param text - JSON text to return
 * @returns Mock LanguageModel
 */
export function createSimpleMockModel(text: string): LanguageModel {
  return createMockLanguageModel([{ text }]);
}

/**
 * Create a mock language model that fails on first N calls then succeeds.
 *
 * @param failCount - Number of calls to fail
 * @param successResponse - Response to return after failures
 * @param failError - Error to throw on failures
 * @returns Mock LanguageModel
 */
export function createRetryMockModel(
  failCount: number,
  successResponse: string,
  failError: Error = new Error('Temporary AI error')
): LanguageModel {
  const responses: MockAIResponseConfig[] = [];

  for (let i = 0; i < failCount; i++) {
    responses.push({ text: '', shouldFail: true, error: failError });
  }

  responses.push({ text: successResponse });

  return createMockLanguageModel(responses);
}

/**
 * Create a mock that returns invalid JSON then valid JSON.
 * Useful for testing retry logic on parse errors.
 *
 * @param invalidCount - Number of invalid responses
 * @param validResponse - Valid JSON response
 * @returns Mock LanguageModel
 */
export function createInvalidThenValidMockModel(
  invalidCount: number,
  validResponse: string
): LanguageModel {
  const responses: MockAIResponseConfig[] = [];

  for (let i = 0; i < invalidCount; i++) {
    responses.push({ text: 'This is not valid JSON {{{' });
  }

  responses.push({ text: validResponse });

  return createMockLanguageModel(responses);
}

// ============================================
// Pre-built Mock Responses
// ============================================

/**
 * Standard MQM response for single-language evaluation
 */
export const MOCK_MQM_RESPONSE = JSON.stringify({
  accuracy: 95,
  fluency: 90,
  terminology: 85,
  issues: [],
});

/**
 * MQM response with issues
 */
export const MOCK_MQM_RESPONSE_WITH_ISSUES = JSON.stringify({
  accuracy: 70,
  fluency: 80,
  terminology: 90,
  issues: [
    { type: 'accuracy', severity: 'major', message: 'Some meaning was lost in translation' },
    { type: 'fluency', severity: 'minor', message: 'Word order could be improved' },
  ],
});

/**
 * Low-quality MQM response
 */
export const MOCK_MQM_RESPONSE_LOW_QUALITY = JSON.stringify({
  accuracy: 30,
  fluency: 40,
  terminology: 50,
  issues: [
    { type: 'accuracy', severity: 'critical', message: 'Translation appears to be AI explanation rather than translation' },
  ],
});

/**
 * Create multi-language evaluation response
 */
export function createMockMultiLanguageResponse(
  languages: string[],
  defaultScore: number = 90
): string {
  const evaluations: Record<string, object> = {};

  for (const lang of languages) {
    evaluations[lang] = {
      accuracy: defaultScore,
      fluency: defaultScore - 5,
      terminology: defaultScore - 10,
      issues: [],
    };
  }

  return JSON.stringify({ evaluations });
}

/**
 * Create multi-language response with varied scores
 */
export function createMockMultiLanguageResponseWithScores(
  scores: Record<string, { accuracy: number; fluency: number; terminology: number }>
): string {
  const evaluations: Record<string, object> = {};

  for (const [lang, score] of Object.entries(scores)) {
    evaluations[lang] = {
      accuracy: score.accuracy,
      fluency: score.fluency,
      terminology: score.terminology,
      issues: [],
    };
  }

  return JSON.stringify({ evaluations });
}

// ============================================
// Mock generateText Function
// ============================================

/**
 * Create a mock generateText function for testing.
 *
 * @param responses - Array of responses to return
 * @returns Mock function compatible with AI SDK's generateText
 */
export function createMockGenerateText(responses: MockAIResponseConfig[]) {
  let callIndex = 0;

  return vi.fn().mockImplementation(async () => {
    const config = responses[callIndex] || responses[responses.length - 1];
    callIndex++;

    if (config.shouldFail) {
      throw config.error || new Error('Mock AI error');
    }

    return {
      text: config.text,
      usage: config.usage || { inputTokens: 100, outputTokens: 50 },
      providerMetadata: config.cacheMetrics
        ? { anthropic: config.cacheMetrics }
        : undefined,
    };
  });
}

// ============================================
// Test Utilities
// ============================================

/**
 * Create a response wrapped in markdown code block (common AI behavior)
 */
export function wrapInMarkdown(json: string): string {
  return `Here is the evaluation:

\`\`\`json
${json}
\`\`\`

I hope this helps!`;
}

/**
 * Create mock cache metrics showing cache hit
 */
export function createCacheHitMetrics(tokensRead: number = 500): MockCacheMetrics {
  return {
    cacheReadInputTokens: tokensRead,
    cacheCreationInputTokens: 0,
  };
}

/**
 * Create mock cache metrics showing cache creation
 */
export function createCacheCreationMetrics(tokensCreated: number = 1000): MockCacheMetrics {
  return {
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: tokensCreated,
  };
}
