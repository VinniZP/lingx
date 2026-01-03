/**
 * AI Model Factory
 *
 * Creates language models for different AI providers.
 * Centralizes provider configuration and validation.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

// ============================================
// Types
// ============================================

/**
 * Supported AI providers for quality evaluation
 */
export type AIProvider = 'OPENAI' | 'ANTHROPIC';

/**
 * Configuration for creating a language model
 */
export interface ModelConfig {
  /** AI provider (OPENAI or ANTHROPIC) */
  provider: AIProvider;
  /** Model ID (e.g., 'gpt-4', 'claude-3-sonnet') */
  modelId: string;
  /** API key for the provider */
  apiKey: string;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a language model for the specified provider.
 *
 * @param config - Model configuration
 * @returns Configured LanguageModel instance
 * @throws Error if provider is not supported
 *
 * @example
 * const model = createLanguageModel({
 *   provider: 'ANTHROPIC',
 *   modelId: 'claude-3-5-sonnet-20241022',
 *   apiKey: 'sk-ant-...'
 * });
 */
export function createLanguageModel(config: ModelConfig): LanguageModel {
  const { provider, modelId, apiKey } = config;

  switch (provider) {
    case 'OPENAI': {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case 'ANTHROPIC': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Check if a provider is supported.
 *
 * @param provider - Provider string to check
 * @returns true if provider is supported
 */
export function isSupportedProvider(provider: string): provider is AIProvider {
  return provider === 'OPENAI' || provider === 'ANTHROPIC';
}

/**
 * Check if a provider supports prompt caching.
 *
 * @param provider - AI provider
 * @returns true if provider supports caching
 */
export function supportsCaching(_provider: AIProvider): boolean {
  // Both OpenAI and Anthropic support prompt caching
  // Anthropic: explicit cacheControl
  // OpenAI: automatic for prompts >= 1024 tokens
  return true;
}

/**
 * Check if a provider requires explicit cache control.
 *
 * @param provider - AI provider
 * @returns true if provider needs explicit cacheControl in messages
 */
export function requiresExplicitCacheControl(provider: AIProvider): boolean {
  return provider === 'ANTHROPIC';
}
