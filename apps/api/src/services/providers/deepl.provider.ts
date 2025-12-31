/**
 * DeepL Machine Translation Provider
 *
 * Integrates with DeepL API for high-quality machine translation.
 * Supports formality levels, language detection, and batch translation.
 *
 * @see https://www.deepl.com/docs-api
 */
import * as deepl from 'deepl-node';
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
 * DeepL language code mapping from ISO 639-1 to DeepL format
 * DeepL uses some non-standard codes (e.g., EN-US, EN-GB, PT-BR, PT-PT)
 */
const SOURCE_LANGUAGE_MAP: Record<string, deepl.SourceLanguageCode> = {
  bg: 'bg',
  cs: 'cs',
  da: 'da',
  de: 'de',
  el: 'el',
  en: 'en',
  es: 'es',
  et: 'et',
  fi: 'fi',
  fr: 'fr',
  hu: 'hu',
  id: 'id',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  lt: 'lt',
  lv: 'lv',
  nb: 'nb',
  nl: 'nl',
  pl: 'pl',
  pt: 'pt',
  ro: 'ro',
  ru: 'ru',
  sk: 'sk',
  sl: 'sl',
  sv: 'sv',
  tr: 'tr',
  uk: 'uk',
  zh: 'zh',
};

const TARGET_LANGUAGE_MAP: Record<string, deepl.TargetLanguageCode> = {
  bg: 'bg',
  cs: 'cs',
  da: 'da',
  de: 'de',
  el: 'el',
  en: 'en-US', // Default to US English
  'en-us': 'en-US',
  'en-gb': 'en-GB',
  es: 'es',
  et: 'et',
  fi: 'fi',
  fr: 'fr',
  hu: 'hu',
  id: 'id',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  lt: 'lt',
  lv: 'lv',
  nb: 'nb',
  nl: 'nl',
  pl: 'pl',
  pt: 'pt-PT', // Default to European Portuguese
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-PT',
  ro: 'ro',
  ru: 'ru',
  sk: 'sk',
  sl: 'sl',
  sv: 'sv',
  tr: 'tr',
  uk: 'uk',
  zh: 'zh-HANS', // Default to Simplified Chinese
  'zh-hans': 'zh-HANS',
  'zh-hant': 'zh-HANT',
};

/** DeepL formality mapping */
const FORMALITY_MAP: Record<string, deepl.Formality> = {
  default: 'default',
  more: 'more',
  less: 'less',
  prefer_more: 'prefer_more',
  prefer_less: 'prefer_less',
};

/**
 * DeepL pricing (as of December 2024)
 * Free: 500,000 chars/month
 * Pro: $5.49 per million characters
 */
const DEEPL_PRICE_PER_MILLION = 5.49;

export class DeepLProvider implements MTProvider {
  readonly name = 'DeepL';
  readonly providerId = 'DEEPL' as const;

  private translator: deepl.Translator | null = null;

  /**
   * Initialize the DeepL translator with API key
   */
  initialize(config: MTProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('DeepL API key is required');
    }
    this.translator = new deepl.Translator(config.apiKey);
  }

  /**
   * Ensure translator is initialized
   */
  private ensureInitialized(): deepl.Translator {
    if (!this.translator) {
      throw new Error('DeepL provider not initialized. Call initialize() first.');
    }
    return this.translator;
  }

  /**
   * Translate a single text
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: MTTranslateOptions
  ): Promise<MTTranslation> {
    const translator = this.ensureInitialized();

    const sourceLang = this.normalizeSourceLanguage(sourceLanguage);
    const targetLang = this.normalizeTargetLanguage(targetLanguage);

    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    const result = await translator.translateText(text, sourceLang, targetLang, {
      formality: options?.formality
        ? FORMALITY_MAP[options.formality]
        : undefined,
      preserveFormatting: options?.preserveFormatting,
    });

    return {
      text: result.text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      detectedSourceLanguage: result.detectedSourceLang?.toLowerCase(),
    };
  }

  /**
   * Batch translate multiple texts
   * DeepL supports up to 50 texts per request
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    options?: MTTranslateOptions
  ): Promise<MTTranslation[]> {
    const translator = this.ensureInitialized();

    if (texts.length === 0) {
      return [];
    }

    const sourceLang = this.normalizeSourceLanguage(sourceLanguage);
    const targetLang = this.normalizeTargetLanguage(targetLanguage);

    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    // DeepL accepts arrays directly
    const results = await translator.translateText(texts, sourceLang, targetLang, {
      formality: options?.formality
        ? FORMALITY_MAP[options.formality]
        : undefined,
      preserveFormatting: options?.preserveFormatting,
    });

    // Ensure results is an array
    const resultArray = Array.isArray(results) ? results : [results];

    return resultArray.map((result) => ({
      text: result.text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      detectedSourceLanguage: result.detectedSourceLang?.toLowerCase(),
    }));
  }

  /**
   * Check if language pair is supported
   */
  supportsLanguagePair(
    sourceLanguage: string,
    targetLanguage: string
  ): LanguagePairSupport {
    const normalizedSource = this.normalizeSourceLanguage(sourceLanguage);
    const normalizedTarget = this.normalizeTargetLanguage(targetLanguage);

    if (!normalizedTarget) {
      return { supported: false };
    }

    return {
      supported: true,
      normalizedSource: normalizedSource || undefined,
      normalizedTarget: normalizedTarget,
    };
  }

  /**
   * Get DeepL usage statistics
   */
  async getUsage(): Promise<MTUsageInfo | null> {
    const translator = this.ensureInitialized();

    try {
      const usage = await translator.getUsage();
      return {
        characterCount: usage.character?.count || 0,
        characterLimit: usage.character?.limit || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Estimate translation cost
   */
  estimateCost(characterCount: number): MTCostEstimate {
    return {
      cost: (characterCount / 1_000_000) * DEEPL_PRICE_PER_MILLION,
      currency: 'USD',
      pricePerMillion: DEEPL_PRICE_PER_MILLION,
    };
  }

  /**
   * Get supported source languages
   */
  getSupportedSourceLanguages(): string[] {
    return Object.keys(SOURCE_LANGUAGE_MAP);
  }

  /**
   * Get supported target languages
   */
  getSupportedTargetLanguages(): string[] {
    return Object.keys(TARGET_LANGUAGE_MAP);
  }

  /**
   * Normalize source language code to DeepL format
   */
  private normalizeSourceLanguage(
    lang: string
  ): deepl.SourceLanguageCode | null {
    const normalized = lang.toLowerCase();
    return SOURCE_LANGUAGE_MAP[normalized] || null;
  }

  /**
   * Normalize target language code to DeepL format
   */
  private normalizeTargetLanguage(
    lang: string
  ): deepl.TargetLanguageCode | null {
    const normalized = lang.toLowerCase();
    return TARGET_LANGUAGE_MAP[normalized] || null;
  }
}
