/**
 * Machine Translation Provider Interface
 *
 * Defines the contract for MT provider adapters (DeepL, Google Translate, etc.)
 */

export interface MTTranslation {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedSourceLanguage?: string;
}

export interface MTTranslateOptions {
  /** Formality level (DeepL specific) */
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less';
  /** Preserve formatting like XML tags */
  preserveFormatting?: boolean;
  /** Glossary ID for custom terminology (future) */
  glossaryId?: string;
}

export interface MTProviderConfig {
  apiKey: string;
  /** Region for provider (e.g., Google Cloud region) */
  region?: string;
}

export interface MTUsageInfo {
  characterCount: number;
  characterLimit?: number;
}

/**
 * Language pair support check result
 */
export interface LanguagePairSupport {
  supported: boolean;
  /** Normalized source language code */
  normalizedSource?: string;
  /** Normalized target language code */
  normalizedTarget?: string;
}

/**
 * Cost estimation per provider
 * Prices as of December 2024 (may vary)
 */
export interface MTCostEstimate {
  /** Cost in USD */
  cost: number;
  /** Currency code */
  currency: string;
  /** Price per million characters */
  pricePerMillion: number;
}

/**
 * Machine Translation Provider Interface
 *
 * All MT providers must implement this interface for consistent behavior.
 */
export interface MTProvider {
  /** Provider name for display */
  readonly name: string;

  /** Provider identifier matching MTProvider enum */
  readonly providerId: 'DEEPL' | 'GOOGLE_TRANSLATE';

  /**
   * Initialize the provider with API credentials
   * Must be called before any translation operations
   */
  initialize(config: MTProviderConfig): void;

  /**
   * Translate a single text
   *
   * @param text - Text to translate
   * @param sourceLanguage - ISO 639-1 source language code
   * @param targetLanguage - ISO 639-1 target language code
   * @param options - Optional translation settings
   * @returns Translated text with metadata
   */
  translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: MTTranslateOptions
  ): Promise<MTTranslation>;

  /**
   * Batch translate multiple texts
   * More efficient than individual calls for large batches
   *
   * @param texts - Array of texts to translate
   * @param sourceLanguage - ISO 639-1 source language code
   * @param targetLanguage - ISO 639-1 target language code
   * @param options - Optional translation settings
   * @returns Array of translated texts (same order as input)
   */
  translateBatch(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    options?: MTTranslateOptions
  ): Promise<MTTranslation[]>;

  /**
   * Check if a language pair is supported
   *
   * @param sourceLanguage - ISO 639-1 source language code
   * @param targetLanguage - ISO 639-1 target language code
   * @returns Support information with normalized codes
   */
  supportsLanguagePair(
    sourceLanguage: string,
    targetLanguage: string
  ): LanguagePairSupport;

  /**
   * Get current usage statistics (if supported by provider)
   * Returns null if usage tracking is not available
   */
  getUsage?(): Promise<MTUsageInfo | null>;

  /**
   * Estimate cost for given character count
   *
   * @param characterCount - Number of characters to translate
   * @returns Cost estimate in USD
   */
  estimateCost(characterCount: number): MTCostEstimate;

  /**
   * Get supported source languages
   */
  getSupportedSourceLanguages(): string[];

  /**
   * Get supported target languages
   */
  getSupportedTargetLanguages(): string[];

  // ============================================
  // GLOSSARY METHODS (optional)
  // ============================================

  /**
   * Create or update a glossary on the provider
   *
   * @param name - Glossary name
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   * @param entries - Glossary entries (source/target term pairs)
   * @returns External glossary ID from provider
   */
  createGlossary?(
    name: string,
    sourceLanguage: string,
    targetLanguage: string,
    entries: Array<{ source: string; target: string }>
  ): Promise<string>;

  /**
   * Delete a glossary from the provider
   *
   * @param glossaryId - External glossary ID
   */
  deleteGlossary?(glossaryId: string): Promise<void>;

  /**
   * List available glossaries
   */
  listGlossaries?(): Promise<
    Array<{
      id: string;
      name: string;
      sourceLanguage: string;
      targetLanguage: string;
      entryCount: number;
    }>
  >;
}
