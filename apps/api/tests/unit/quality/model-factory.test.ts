/**
 * Model Factory Unit Tests
 *
 * Tests AI model creation and provider utilities.
 */

import { describe, expect, it } from 'vitest';
import {
  createLanguageModel,
  isSupportedProvider,
  requiresExplicitCacheControl,
  supportsCaching,
  type AIProvider,
} from '../../../src/modules/quality-estimation/quality/ai/model-factory.js';

// ============================================
// createLanguageModel
// ============================================

describe('createLanguageModel', () => {
  it('should create OpenAI model', () => {
    const model = createLanguageModel({
      provider: 'OPENAI',
      modelId: 'gpt-4',
      apiKey: 'test-key',
    });

    expect(model).toBeDefined();
    expect(model.modelId).toBe('gpt-4');
    expect(model.provider).toMatch(/^openai\./); // Provider prefix may vary
  });

  it('should create Anthropic model', () => {
    const model = createLanguageModel({
      provider: 'ANTHROPIC',
      modelId: 'claude-3-5-sonnet-20241022',
      apiKey: 'test-key',
    });

    expect(model).toBeDefined();
    expect(model.modelId).toBe('claude-3-5-sonnet-20241022');
    expect(model.provider).toMatch(/^anthropic\./); // Provider prefix may vary
  });

  it('should throw for unsupported provider', () => {
    expect(() =>
      createLanguageModel({
        provider: 'UNSUPPORTED' as AIProvider,
        modelId: 'model',
        apiKey: 'key',
      })
    ).toThrow('Unsupported AI provider: UNSUPPORTED');
  });

  it('should accept different model IDs for OpenAI', () => {
    const model1 = createLanguageModel({
      provider: 'OPENAI',
      modelId: 'gpt-4-turbo',
      apiKey: 'key',
    });
    const model2 = createLanguageModel({
      provider: 'OPENAI',
      modelId: 'gpt-3.5-turbo',
      apiKey: 'key',
    });

    expect(model1.modelId).toBe('gpt-4-turbo');
    expect(model2.modelId).toBe('gpt-3.5-turbo');
  });

  it('should accept different model IDs for Anthropic', () => {
    const model1 = createLanguageModel({
      provider: 'ANTHROPIC',
      modelId: 'claude-3-5-sonnet-20241022',
      apiKey: 'key',
    });
    const model2 = createLanguageModel({
      provider: 'ANTHROPIC',
      modelId: 'claude-3-haiku-20240307',
      apiKey: 'key',
    });

    expect(model1.modelId).toBe('claude-3-5-sonnet-20241022');
    expect(model2.modelId).toBe('claude-3-haiku-20240307');
  });
});

// ============================================
// isSupportedProvider
// ============================================

describe('isSupportedProvider', () => {
  it('should return true for OPENAI', () => {
    expect(isSupportedProvider('OPENAI')).toBe(true);
  });

  it('should return true for ANTHROPIC', () => {
    expect(isSupportedProvider('ANTHROPIC')).toBe(true);
  });

  it('should return false for unsupported providers', () => {
    expect(isSupportedProvider('GOOGLE')).toBe(false);
    expect(isSupportedProvider('AZURE')).toBe(false);
    expect(isSupportedProvider('')).toBe(false);
    expect(isSupportedProvider('openai')).toBe(false); // Case sensitive
  });
});

// ============================================
// supportsCaching
// ============================================

describe('supportsCaching', () => {
  it('should return true for OpenAI', () => {
    expect(supportsCaching('OPENAI')).toBe(true);
  });

  it('should return true for Anthropic', () => {
    expect(supportsCaching('ANTHROPIC')).toBe(true);
  });
});

// ============================================
// requiresExplicitCacheControl
// ============================================

describe('requiresExplicitCacheControl', () => {
  it('should return true for Anthropic', () => {
    expect(requiresExplicitCacheControl('ANTHROPIC')).toBe(true);
  });

  it('should return false for OpenAI', () => {
    expect(requiresExplicitCacheControl('OPENAI')).toBe(false);
  });
});
