/**
 * AI Quality Evaluation Modules
 *
 * Exports circuit breaker and retry strategy for AI calls.
 */

export {
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type CircuitBreakerConfig,
} from './circuit-breaker.js';

export {
  DEFAULT_RETRY_CONFIG,
  calculateBackoff,
  isTransientError,
  shouldRetry,
  sleep,
  withRetry,
  type RetryConfig,
} from './retry-strategy.js';

export {
  createMultiLanguageSchema,
  extractJsonFromText,
  formatParseError,
  isJsonSyntaxError,
  isZodError,
  languageEvaluationSchema,
  parseMQMResponse,
  parseWithZodSchema,
  validateMQMResponse,
  type MQMIssue,
  type MQMResult,
} from './response-parser.js';

export {
  MQM_MULTI_LANGUAGE_SYSTEM_PROMPT,
  MQM_SYSTEM_PROMPT,
  buildMQMUserPrompt,
  buildMultiLanguagePrompt,
  escapeXml,
  type RelatedKeyMultiLang,
} from './prompts.js';

export {
  createLanguageModel,
  isSupportedProvider,
  requiresExplicitCacheControl,
  supportsCaching,
  type AIProvider,
  type ModelConfig,
} from './model-factory.js';
