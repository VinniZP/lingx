/**
 * AI Provider Service
 *
 * Provides provider-specific utilities for AI translation:
 * - Language model factory
 * - Provider model constants
 * - Pricing information
 * - API key encryption/decryption
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { AIProvider as AIProviderEnum } from '@prisma/client';
import type { LanguageModel } from 'ai';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { BadRequestError } from '../../../plugins/error-handler.js';

// ============================================
// TYPES
// ============================================

export type AIProviderType = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE_AI' | 'MISTRAL';

// ============================================
// CONSTANTS
// ============================================

/** Supported AI providers and their models (January 2026) */
export const PROVIDER_MODELS: Record<AIProviderEnum, string[]> = {
  // OpenAI: GPT-5.x series (full, mini, nano) + GPT-4.1 + o4
  OPENAI: ['gpt-5.2', 'gpt-5.1', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
  // Anthropic: Claude 4.5 series - using alias format (auto-updates to latest)
  ANTHROPIC: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-5'],
  // Google: Gemini 3 (Nov 2025), Gemini 2.0 (2024)
  GOOGLE_AI: ['gemini-3-flash', 'gemini-3-pro', 'gemini-2.0-flash'],
  MISTRAL: ['mistral-large-latest', 'mistral-small-latest'],
};

/** Pricing per 1M tokens (input, output) in USD - January 2026 */
export const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI GPT-5.x series (2025-2026)
  'gpt-5.2': { input: 1.75, output: 14.0 },
  'gpt-5.1': { input: 1.25, output: 10.0 },
  'gpt-5-mini': { input: 0.25, output: 2.0 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  // OpenAI GPT-4.1 + o4 series
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'o4-mini': { input: 1.1, output: 4.4 },
  // Anthropic Claude 4.5 series (2025)
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-opus-4-5': { input: 15.0, output: 75.0 },
  // Google AI Gemini 3 (Nov 2025)
  'gemini-3-flash': { input: 0.15, output: 0.6 },
  'gemini-3-pro': { input: 1.25, output: 5.0 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  // Mistral
  'mistral-large-latest': { input: 2.0, output: 6.0 },
  'mistral-small-latest': { input: 0.2, output: 0.6 },
};

// ============================================
// SERVICE
// ============================================

export class AIProviderService {
  /**
   * Get supported models for a provider
   */
  getSupportedModels(provider: AIProviderType): string[] {
    return PROVIDER_MODELS[provider as AIProviderEnum] || [];
  }

  /**
   * Validate that a model is supported for a provider
   */
  validateModel(provider: AIProviderType, model: string): void {
    const validModels = PROVIDER_MODELS[provider as AIProviderEnum];
    if (!validModels?.includes(model)) {
      throw new BadRequestError(
        `Invalid model "${model}" for provider ${provider}. Valid models: ${validModels?.join(', ')}`
      );
    }
  }

  /**
   * Get language model instance for provider
   */
  getLanguageModel(provider: AIProviderType, model: string, apiKey: string): LanguageModel {
    switch (provider) {
      case 'OPENAI': {
        const openai = createOpenAI({ apiKey });
        return openai(model);
      }
      case 'ANTHROPIC': {
        const anthropic = createAnthropic({ apiKey });
        return anthropic(model);
      }
      case 'GOOGLE_AI': {
        const google = createGoogleGenerativeAI({ apiKey });
        return google(model);
      }
      case 'MISTRAL': {
        const mistral = createMistral({ apiKey });
        return mistral(model);
      }
    }
  }

  /**
   * Estimate cost for token usage
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model];
    if (!pricing) {
      console.warn(
        `[AI Provider] Unknown model "${model}" for pricing - using default estimate ($1.00/1M tokens)`
      );
      const fallbackPricing = { input: 1.0, output: 1.0 };
      return (
        (inputTokens * fallbackPricing.input + outputTokens * fallbackPricing.output) / 1_000_000
      );
    }
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }

  /**
   * Encrypt API key using AES-256-GCM
   */
  encryptApiKey(apiKey: string): { encrypted: string; iv: string } {
    const key = this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + authTag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt API key
   */
  decryptApiKey(encrypted: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');

    // Split encrypted data and auth tag (last 32 hex chars = 16 bytes)
    const authTag = Buffer.from(encrypted.slice(-32), 'hex');
    const encryptedData = encrypted.slice(0, -32);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get first 8 characters of API key for identification
   */
  getKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, 8) + '...';
  }

  /**
   * Get encryption key from environment.
   *
   * Uses MT_ENCRYPTION_KEY for consistency with machine translation module.
   * Both AI and MT features share the same encryption key to simplify deployment
   * and avoid key management issues where data encrypted with one key cannot be
   * decrypted after switching to another.
   *
   * @throws Error if MT_ENCRYPTION_KEY is not set or invalid
   */
  private getEncryptionKey(): Buffer {
    const keyHex = process.env.MT_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'MT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate with: openssl rand -hex 32'
      );
    }
    return Buffer.from(keyHex, 'hex');
  }
}
