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
  calculateBackoff,
  shouldRetry,
  sleep,
  withRetry,
  isTransientError,
  DEFAULT_RETRY_CONFIG,
  CONVERSATION_RETRY_CONFIG,
  type RetryConfig,
} from './retry-strategy.js';

export {
  extractJsonFromText,
  parseMQMResponse,
  validateMQMResponse,
  parseWithZodSchema,
  formatParseError,
  isJsonSyntaxError,
  isZodError,
  languageEvaluationSchema,
  createMultiLanguageSchema,
  type MQMResult,
  type MQMIssue,
  type LanguageEvaluation,
  type MultiLanguageEvaluationResult,
} from './response-parser.js';

export {
  MQM_SYSTEM_PROMPT,
  MQM_MULTI_LANGUAGE_SYSTEM_PROMPT,
  escapeXml,
  buildMQMUserPrompt,
  buildMultiLanguagePrompt,
  type RelatedKeyMultiLang,
} from './prompts.js';

export {
  createLanguageModel,
  isSupportedProvider,
  supportsCaching,
  requiresExplicitCacheControl,
  type AIProvider,
  type ModelConfig,
} from './model-factory.js';
