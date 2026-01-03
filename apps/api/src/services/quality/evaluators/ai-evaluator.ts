/**
 * AI Evaluator
 *
 * Handles AI-powered translation quality evaluation using MQM framework.
 * Supports single-language and multi-language batch evaluation.
 * Uses circuit breaker pattern for resilience.
 */

import { generateText, type LanguageModel } from 'ai';
import { z } from 'zod';
import {
  CircuitBreaker,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateBackoff,
  sleep,
} from '../ai/index.js';
import {
  MQM_SYSTEM_PROMPT,
  MQM_MULTI_LANGUAGE_SYSTEM_PROMPT,
  buildMQMUserPrompt,
  buildMultiLanguagePrompt,
  type RelatedKeyMultiLang,
} from '../ai/prompts.js';
import {
  validateMQMResponse,
  createMultiLanguageSchema,
} from '../ai/response-parser.js';

// ============================================
// Types
// ============================================

/**
 * Result from AI evaluation for a single language
 */
export interface AIEvaluationResult {
  /** Semantic accuracy score (0-100) */
  accuracy: number;
  /** Natural language fluency score (0-100) */
  fluency: number;
  /** Domain terminology score (0-100) */
  terminology: number;
  /** Issues found by AI */
  issues: Array<{
    type: string;
    severity: 'critical' | 'major' | 'minor';
    message: string;
  }>;
  /** Token usage for this evaluation */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Cache metrics (Anthropic/OpenAI prompt caching) */
  cacheMetrics: {
    cacheRead: number;
    cacheCreation: number;
  };
}

/**
 * Configuration for AI model
 */
export interface AIModelConfig {
  /** Language model instance */
  model: LanguageModel;
  /** Whether provider is Anthropic (for cache control) */
  isAnthropic: boolean;
}

/**
 * Related key context for single-language evaluation
 */
export interface RelatedKeySingle {
  key: string;
  source: string;
  target: string;
}

// ============================================
// Constants
// ============================================

/** Max retries for invalid JSON responses (single-language) */
const MAX_SINGLE_RETRIES = 2;

/** Conversation retry settings for multi-language evaluation */
const MAX_TURNS_PER_CONVERSATION = 7;
const MAX_FRESH_STARTS = 3;
const MAX_CONVERSATION_MESSAGES = 10;

// ============================================
// AI Evaluator Class
// ============================================

/**
 * AI-powered translation quality evaluator.
 *
 * Uses MQM (Multidimensional Quality Metrics) framework for
 * evaluating translation accuracy, fluency, and terminology.
 *
 * @example
 * const evaluator = new AIEvaluator(circuitBreaker);
 *
 * const result = await evaluator.evaluateSingle(
 *   'greeting.hello',
 *   'Hello',
 *   'Hola',
 *   'en',
 *   'es',
 *   [],
 *   { model, isAnthropic: false }
 * );
 */
export class AIEvaluator {
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  /**
   * Create an AI evaluator.
   *
   * @param circuitBreaker - Circuit breaker for resilience
   * @param retryConfig - Optional retry configuration
   */
  constructor(
    circuitBreaker: CircuitBreaker,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.circuitBreaker = circuitBreaker;
    this.retryConfig = retryConfig;
  }

  /**
   * Evaluate a single translation using AI.
   *
   * @param keyName - Translation key name
   * @param source - Source text
   * @param target - Target translation
   * @param sourceLocale - Source language code
   * @param targetLocale - Target language code
   * @param relatedKeys - Related translations for context
   * @param config - AI model configuration
   * @returns AI evaluation result
   */
  async evaluateSingle(
    keyName: string,
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string,
    relatedKeys: RelatedKeySingle[],
    config: AIModelConfig
  ): Promise<AIEvaluationResult> {
    const userPrompt = buildMQMUserPrompt(
      keyName,
      source,
      target,
      sourceLocale,
      targetLocale,
      relatedKeys
    );

    return this.callWithRetry(config.model, userPrompt, config.isAnthropic);
  }

  /**
   * Evaluate multiple translations for different languages using AI.
   *
   * Uses conversation retry pattern for better JSON parsing recovery.
   * More token-efficient than calling evaluateSingle for each language.
   *
   * @param keyName - Translation key name
   * @param source - Source text
   * @param sourceLocale - Source language code
   * @param translations - Array of language/value pairs
   * @param relatedKeys - Related translations with all languages
   * @param config - AI model configuration
   * @returns Map of language code to evaluation result
   */
  async evaluateMultiLanguage(
    keyName: string,
    source: string,
    sourceLocale: string,
    translations: Array<{ language: string; value: string }>,
    relatedKeys: RelatedKeyMultiLang[],
    config: AIModelConfig
  ): Promise<Map<string, AIEvaluationResult>> {
    const languages = translations.map((t) => t.language);
    const userPrompt = buildMultiLanguagePrompt(
      keyName,
      source,
      sourceLocale,
      translations,
      relatedKeys
    );

    const schema = createMultiLanguageSchema(languages);

    const { result, usage, cacheMetrics } = await this.callWithConversationRetry(
      config.model,
      userPrompt,
      schema,
      config.isAnthropic
    );

    // Convert to Map of individual results
    const results = new Map<string, AIEvaluationResult>();
    const languageCount = languages.length || 1;

    for (const lang of languages) {
      const langResult = result.evaluations[lang];
      if (langResult) {
        results.set(lang, {
          accuracy: langResult.accuracy,
          fluency: langResult.fluency,
          terminology: langResult.terminology,
          issues: langResult.issues,
          usage: {
            inputTokens: Math.round(usage.inputTokens / languageCount),
            outputTokens: Math.round(usage.outputTokens / languageCount),
          },
          cacheMetrics: {
            cacheRead: Math.round(cacheMetrics.cacheRead / languageCount),
            cacheCreation: Math.round(cacheMetrics.cacheCreation / languageCount),
          },
        });
      }
    }

    return results;
  }

  /**
   * Check if circuit breaker allows AI calls.
   */
  canAttempt(): boolean {
    return this.circuitBreaker.canAttempt();
  }

  /**
   * Get remaining time until circuit breaker resets.
   */
  getRemainingOpenTime(): number {
    return this.circuitBreaker.getRemainingOpenTime();
  }

  // ============================================
  // Private: Retry Logic
  // ============================================

  /**
   * Call AI with retry for invalid JSON (single-language).
   */
  private async callWithRetry(
    model: LanguageModel,
    userPrompt: string,
    isAnthropic: boolean
  ): Promise<AIEvaluationResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_SINGLE_RETRIES; attempt++) {
      // Build messages with cache control for Anthropic
      const systemMessage = {
        role: 'system' as const,
        content: MQM_SYSTEM_PROMPT,
        ...(isAnthropic && {
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        }),
      };

      const userMessage = {
        role: 'user' as const,
        content:
          attempt === 0
            ? userPrompt
            : `${userPrompt}\n\nIMPORTANT: Return valid JSON only. Previous response was invalid: ${lastError?.message}`,
      };

      const messages = [systemMessage, userMessage];

      const { text, usage, providerMetadata } = await generateText({
        model,
        messages,
      });

      // Extract cache metrics from Anthropic response
      const anthropicMeta = providerMetadata?.anthropic as
        | {
            cacheReadInputTokens?: number;
            cacheCreationInputTokens?: number;
          }
        | undefined;

      const cacheMetrics = {
        cacheRead: anthropicMeta?.cacheReadInputTokens || 0,
        cacheCreation: anthropicMeta?.cacheCreationInputTokens || 0,
      };

      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const result = validateMQMResponse(parsed);

        if (attempt > 0) {
          console.log(`[AIEvaluator] JSON parse succeeded on retry ${attempt}`);
        }

        return {
          accuracy: result.accuracy,
          fluency: result.fluency,
          terminology: result.terminology,
          issues: result.issues,
          usage: {
            inputTokens: usage?.inputTokens || 0,
            outputTokens: usage?.outputTokens || 0,
          },
          cacheMetrics,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[AIEvaluator] JSON parse failed (attempt ${attempt + 1}/${MAX_SINGLE_RETRIES + 1}): ${lastError.message}`
        );

        if (attempt === MAX_SINGLE_RETRIES) {
          throw new Error(
            `Failed to get valid JSON after ${MAX_SINGLE_RETRIES + 1} attempts: ${lastError.message}`
          );
        }
      }
    }

    throw lastError; // TypeScript satisfaction
  }

  /**
   * Call AI with conversation retry for multi-language evaluation.
   *
   * Uses a multi-turn conversation approach to recover from JSON errors.
   * The AI can see its previous attempts and fix mistakes.
   */
  private async callWithConversationRetry<T>(
    model: LanguageModel,
    userPrompt: string,
    schema: z.ZodType<T>,
    isAnthropic: boolean
  ): Promise<{
    result: T;
    usage: { inputTokens: number; outputTokens: number };
    cacheMetrics: { cacheRead: number; cacheCreation: number };
  }> {
    // Check circuit breaker before attempting AI calls
    if (!this.circuitBreaker.canAttempt()) {
      const remainingMs = this.circuitBreaker.getRemainingOpenTime();
      throw new Error(
        `Circuit breaker is open: too many AI failures. Retry after ${Math.ceil(remainingMs / 1000)}s`
      );
    }

    let totalAttempts = 0;

    for (let freshStart = 1; freshStart <= MAX_FRESH_STARTS; freshStart++) {
      // Build system message with cache control
      const systemMessage = {
        role: 'system' as const,
        content: MQM_MULTI_LANGUAGE_SYSTEM_PROMPT,
        ...(isAnthropic && {
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        }),
      };

      // Start with initial user message
      const conversationHistory: Array<
        { role: 'user'; content: string } | { role: 'assistant'; content: string }
      > = [{ role: 'user' as const, content: userPrompt }];

      let totalUsage = { inputTokens: 0, outputTokens: 0 };
      let cacheMetrics = { cacheRead: 0, cacheCreation: 0 };

      for (let turn = 1; turn <= MAX_TURNS_PER_CONVERSATION; turn++) {
        totalAttempts++;

        // Apply exponential backoff for retries (skip for first turn of first fresh start)
        if (totalAttempts > 1) {
          const backoffDelay = calculateBackoff(totalAttempts - 2, this.retryConfig);
          console.log(`[AIEvaluator] Backoff: waiting ${backoffDelay}ms before retry`);
          await sleep(backoffDelay);
        }

        console.log(
          `[AIEvaluator] Fresh start ${freshStart}/${MAX_FRESH_STARTS}, turn ${turn}/${MAX_TURNS_PER_CONVERSATION} (total attempts: ${totalAttempts})`
        );

        // Build messages array for this call
        const messages = [systemMessage, ...conversationHistory];

        try {
          const { text, usage, providerMetadata } = await generateText({
            model,
            messages,
          });

          // Accumulate usage
          totalUsage.inputTokens += usage?.inputTokens || 0;
          totalUsage.outputTokens += usage?.outputTokens || 0;

          // Extract cache metrics from Anthropic response
          const anthropicMeta = providerMetadata?.anthropic as
            | {
                cacheReadInputTokens?: number;
                cacheCreationInputTokens?: number;
              }
            | undefined;

          cacheMetrics.cacheRead += anthropicMeta?.cacheReadInputTokens || 0;
          cacheMetrics.cacheCreation += anthropicMeta?.cacheCreationInputTokens || 0;

          // Add assistant response to history (with memory limit)
          conversationHistory.push({ role: 'assistant' as const, content: text });

          // Trim conversation history if too long
          if (conversationHistory.length > MAX_CONVERSATION_MESSAGES) {
            const firstMessage = conversationHistory[0];
            const recentMessages = conversationHistory.slice(-MAX_CONVERSATION_MESSAGES + 1);
            conversationHistory.length = 0;
            conversationHistory.push(firstMessage, ...recentMessages);
            console.log(
              `[AIEvaluator] Trimmed conversation history to ${conversationHistory.length} messages`
            );
          }

          // 1. Extract JSON from response (handle markdown code blocks)
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON object found in response');
          }

          // 2. Parse JSON
          const parsed = JSON.parse(jsonMatch[0]);

          // 3. Validate with Zod
          const validated = schema.parse(parsed);

          console.log(
            `[AIEvaluator] Success on fresh start ${freshStart}, turn ${turn} (${totalAttempts} total attempts)`
          );
          this.circuitBreaker.recordSuccess();
          return { result: validated, usage: totalUsage, cacheMetrics };
        } catch (error) {
          // Format error message for AI to understand
          let errorMessage: string;
          if (error instanceof z.ZodError) {
            errorMessage = error.issues
              .map((e) => `Path: ${e.path.join('.')}, Error: ${e.message}`)
              .join('\n');
          } else if (error instanceof SyntaxError) {
            errorMessage = `JSON syntax error: ${error.message}`;
          } else {
            errorMessage = String(error);
          }

          console.warn(
            `[AIEvaluator] Turn ${turn} failed (attempt ${totalAttempts}): ${errorMessage.slice(0, 200)}`
          );

          if (turn < MAX_TURNS_PER_CONVERSATION) {
            // Add error feedback to conversation
            conversationHistory.push({
              role: 'user' as const,
              content: `<validation_error>\n${errorMessage}\n</validation_error>\n\nPlease fix the JSON and try again. Return ONLY the corrected JSON.`,
            });
          }
        }
      }

      console.warn(
        `[AIEvaluator] Fresh start ${freshStart} exhausted all ${MAX_TURNS_PER_CONVERSATION} turns, resetting...`
      );
    }

    // Record failure in circuit breaker after exhausting all attempts
    this.circuitBreaker.recordFailure();

    throw new Error(
      `Failed after ${MAX_FRESH_STARTS} fresh starts × ${MAX_TURNS_PER_CONVERSATION} turns (${totalAttempts} total attempts)`
    );
  }
}
