/**
 * Google Cloud Translation Provider
 *
 * Integrates with Google Cloud Translation API v2 for machine translation.
 * Uses API key authentication (simpler than service account for this use case).
 *
 * @see https://cloud.google.com/translate/docs/reference/rest/v2/translate
 */
import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import type {
  MTProvider,
  MTProviderConfig,
  MTTranslation,
  MTTranslateOptions,
  MTUsageInfo,
  MTCostEstimate,
  LanguagePairSupport,
} from './mt-provider.interface.js';

/**
 * Google Translate supported languages (common subset)
 * Full list: https://cloud.google.com/translate/docs/languages
 */
const SUPPORTED_LANGUAGES = new Set([
  'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs',
  'bg', 'ca', 'ceb', 'zh', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da',
  'nl', 'en', 'eo', 'et', 'fi', 'fr', 'fy', 'gl', 'ka', 'de',
  'el', 'gu', 'ht', 'ha', 'haw', 'he', 'hi', 'hmn', 'hu', 'is',
  'ig', 'id', 'ga', 'it', 'ja', 'jv', 'kn', 'kk', 'km', 'rw',
  'ko', 'ku', 'ky', 'lo', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms',
  'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'ny', 'or',
  'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr',
  'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw',
  'sv', 'tl', 'tg', 'ta', 'tt', 'te', 'th', 'tr', 'tk', 'uk',
  'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu',
]);

/**
 * Google Cloud Translation pricing (as of December 2024)
 * $20 per million characters (first 500k free per month)
 */
const GOOGLE_PRICE_PER_MILLION = 20.0;

export class GoogleTranslateProvider implements MTProvider {
  readonly name = 'Google Translate';
  readonly providerId = 'GOOGLE_TRANSLATE' as const;

  private client: Translate | null = null;

  /**
   * Initialize the Google Translate client with API key
   */
  initialize(config: MTProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('Google Translate API key is required');
    }
    this.client = new Translate({ key: config.apiKey });
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): Translate {
    if (!this.client) {
      throw new Error(
        'Google Translate provider not initialized. Call initialize() first.'
      );
    }
    return this.client;
  }

  /**
   * Translate a single text
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    _options?: MTTranslateOptions
  ): Promise<MTTranslation> {
    const client = this.ensureInitialized();

    const normalizedSource = this.normalizeLanguage(sourceLanguage);
    const normalizedTarget = this.normalizeLanguage(targetLanguage);

    if (!normalizedTarget || !SUPPORTED_LANGUAGES.has(normalizedTarget)) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    const [translation] = await client.translate(text, {
      from: normalizedSource || undefined,
      to: normalizedTarget,
    });

    return {
      text: translation,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      detectedSourceLanguage: normalizedSource || undefined,
    };
  }

  /**
   * Batch translate multiple texts
   * Google Translate accepts arrays directly
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    _options?: MTTranslateOptions
  ): Promise<MTTranslation[]> {
    const client = this.ensureInitialized();

    if (texts.length === 0) {
      return [];
    }

    const normalizedSource = this.normalizeLanguage(sourceLanguage);
    const normalizedTarget = this.normalizeLanguage(targetLanguage);

    if (!normalizedTarget || !SUPPORTED_LANGUAGES.has(normalizedTarget)) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    // Google Translate accepts arrays
    const [translations] = await client.translate(texts, {
      from: normalizedSource || undefined,
      to: normalizedTarget,
    });

    // Ensure result is an array
    const translationArray = Array.isArray(translations)
      ? translations
      : [translations];

    return translationArray.map((translation) => ({
      text: translation,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      detectedSourceLanguage: normalizedSource || undefined,
    }));
  }

  /**
   * Check if language pair is supported
   */
  supportsLanguagePair(
    sourceLanguage: string,
    targetLanguage: string
  ): LanguagePairSupport {
    const normalizedSource = this.normalizeLanguage(sourceLanguage);
    const normalizedTarget = this.normalizeLanguage(targetLanguage);

    const sourceSupported = normalizedSource
      ? SUPPORTED_LANGUAGES.has(normalizedSource)
      : true; // Auto-detect is always supported
    const targetSupported = normalizedTarget
      ? SUPPORTED_LANGUAGES.has(normalizedTarget)
      : false;

    if (!targetSupported) {
      return { supported: false };
    }

    return {
      supported: sourceSupported,
      normalizedSource: normalizedSource || undefined,
      normalizedTarget: normalizedTarget!,
    };
  }

  /**
   * Google Translate doesn't provide usage API
   */
  async getUsage(): Promise<MTUsageInfo | null> {
    // Google Cloud doesn't provide a simple usage API
    // Usage must be tracked via Cloud Console or Billing API
    return null;
  }

  /**
   * Estimate translation cost
   */
  estimateCost(characterCount: number): MTCostEstimate {
    return {
      cost: (characterCount / 1_000_000) * GOOGLE_PRICE_PER_MILLION,
      currency: 'USD',
      pricePerMillion: GOOGLE_PRICE_PER_MILLION,
    };
  }

  /**
   * Get supported source languages
   */
  getSupportedSourceLanguages(): string[] {
    return Array.from(SUPPORTED_LANGUAGES);
  }

  /**
   * Get supported target languages
   */
  getSupportedTargetLanguages(): string[] {
    return Array.from(SUPPORTED_LANGUAGES);
  }

  /**
   * Normalize language code
   */
  private normalizeLanguage(lang: string): string | null {
    if (!lang) return null;

    const normalized = lang.toLowerCase();

    // Handle common variations
    if (normalized === 'zh-hans' || normalized === 'zh-cn') {
      return 'zh-CN';
    }
    if (normalized === 'zh-hant' || normalized === 'zh-tw') {
      return 'zh-TW';
    }

    // Check if base language is supported
    const baseLang = normalized.split('-')[0];
    if (SUPPORTED_LANGUAGES.has(normalized)) {
      return normalized;
    }
    if (SUPPORTED_LANGUAGES.has(baseLang)) {
      return baseLang;
    }

    return null;
  }
}
