import type {
  LocaleflowConfig,
  TranslationBundle,
  SdkTranslationsResponse,
  TranslationValues,
  TranslationFunction,
  NestedTranslationValue,
} from '../types';
import { TranslationCache } from './cache';
import { ICUFormatter, hasICUSyntax } from './icu-formatter';
import { NS_DELIMITER } from '../constants';

/**
 * Get a nested value from an object using dot notation
 * @param obj - The object to traverse
 * @param path - Dot-separated path (e.g., "common.welcome")
 * @returns The value at the path or undefined
 */
export function getNestedValue(obj: TranslationBundle, path: string): string | undefined {
  // Fast path: direct key lookup (for flat bundles)
  if (path in obj && typeof obj[path] === 'string') {
    return obj[path] as string;
  }

  // Nested path traversal
  const parts = path.split('.');
  let current: NestedTranslationValue | undefined = obj;

  for (const part of parts) {
    if (current === undefined || current === null || typeof current === 'string') {
      return undefined;
    }
    current = (current as Record<string, NestedTranslationValue>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Core Localeflow client for translation management.
 * Supports hybrid loading: API first with local JSON fallback.
 */
export class LocaleflowClient {
  private config: LocaleflowConfig;
  private cache: TranslationCache;
  private translations: TranslationBundle = {};
  private availableLanguages: string[] = [];
  private currentLanguage: string;
  private icuFormatter: ICUFormatter;

  // Request deduplication: track pending requests
  private pendingRequests: Map<string, Promise<TranslationBundle>> = new Map();

  constructor(config: LocaleflowConfig) {
    this.config = config;
    this.cache = new TranslationCache();
    this.currentLanguage = config.defaultLanguage;
    this.icuFormatter = new ICUFormatter(config.defaultLanguage);

    // Initialize with static data if provided
    if (config.staticData) {
      this.translations = config.staticData as TranslationBundle;
      this.cache.set(config.defaultLanguage, this.translations);
    }

    // Initialize available languages
    if (config.availableLanguages?.length) {
      this.availableLanguages = config.availableLanguages;
    }
  }

  /**
   * Check if API is configured
   */
  private hasApiConfig(): boolean {
    return !!(this.config.apiUrl && this.config.project && this.config.space && this.config.environment);
  }

  /**
   * Build API URL for fetching translations
   */
  private buildApiUrl(language: string, namespace?: string): string {
    const params = new URLSearchParams({
      project: this.config.project!,
      space: this.config.space!,
      environment: this.config.environment!,
      lang: language,
    });

    if (namespace) {
      params.set('namespace', namespace);
    }

    return `${this.config.apiUrl}/sdk/translations?${params.toString()}`;
  }

  /**
   * Build local path for JSON file
   */
  private buildLocalPath(language: string): string {
    const basePath = this.config.localePath || '/locales';
    return `${basePath}/${language}.json`;
  }

  /**
   * Retry helper with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const maxAttempts = this.config.retry?.maxAttempts ?? 3;
    const baseDelay = this.config.retry?.baseDelay ?? 1000;
    const maxDelay = this.config.retry?.maxDelay ?? 10000;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100,
          maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Fetch translations from API
   */
  private async fetchFromApi(
    language: string,
    namespace?: string
  ): Promise<TranslationBundle> {
    const url = this.buildApiUrl(language, namespace);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const data: SdkTranslationsResponse = await response.json();

    // Update available languages if provided
    if (data.availableLanguages) {
      this.availableLanguages = data.availableLanguages;
    }

    return data.translations;
  }

  /**
   * Fetch translations from local JSON file
   */
  private async fetchFromLocal(language: string): Promise<TranslationBundle> {
    const path = this.buildLocalPath(language);

    const response = await fetch(path, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Local fetch failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Load translations with hybrid strategy: API first, local fallback
   */
  async loadTranslations(
    language: string,
    namespace?: string
  ): Promise<TranslationBundle> {
    const cacheKey = namespace ? `${language}:${namespace}` : language;

    // Check cache first
    const cached = this.cache.get(language, namespace);
    if (cached) {
      return cached;
    }

    // Check for pending request (deduplication)
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create loading promise
    const loadPromise = this.doLoadTranslations(language, namespace, cacheKey);
    this.pendingRequests.set(cacheKey, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal load with retry and fallback
   */
  private async doLoadTranslations(
    language: string,
    namespace: string | undefined,
    cacheKey: string
  ): Promise<TranslationBundle> {
    let translations: TranslationBundle;

    // Try API first if configured
    if (this.hasApiConfig()) {
      try {
        translations = await this.withRetry(
          () => this.fetchFromApi(language, namespace),
          `fetchFromApi(${language})`
        );
        this.cache.set(language, translations, namespace);
        return translations;
      } catch (apiError) {
        // API failed, try local fallback
        console.warn(
          `[Localeflow] API fetch failed for ${language}, falling back to local:`,
          apiError
        );
      }
    }

    // Fallback to local JSON (or primary if no API)
    if (this.config.localePath) {
      try {
        translations = await this.withRetry(
          () => this.fetchFromLocal(language),
          `fetchFromLocal(${language})`
        );
        this.cache.set(language, translations, namespace);
        return translations;
      } catch (localError) {
        throw new Error(
          `Failed to load translations for ${language}: ${localError}`
        );
      }
    }

    throw new Error(
      `No translation source configured for ${language}. Set apiUrl or localePath.`
    );
  }

  /**
   * Load initial translations
   */
  async init(): Promise<void> {
    // Skip if we have static data
    if (this.config.staticData) {
      return;
    }

    // Load default language
    this.translations = await this.loadTranslations(this.currentLanguage);
  }

  /**
   * Change current language
   */
  async setLanguage(language: string): Promise<void> {
    if (language === this.currentLanguage) return;

    this.translations = await this.loadTranslations(language);
    this.currentLanguage = language;
    this.icuFormatter.setLanguage(language);
  }

  /**
   * Load additional namespace
   */
  async loadNamespace(namespace: string): Promise<TranslationBundle> {
    const nsTranslations = await this.loadTranslations(
      this.currentLanguage,
      namespace
    );

    // Prefix keys with namespace+delimiter before merging
    // API returns: { "tags.title": "Tags" }
    // We store as: { "glossary␟tags.title": "Tags" }
    const prefixedTranslations: TranslationBundle = {};
    for (const [key, value] of Object.entries(nsTranslations)) {
      const prefixedKey = `${namespace}${NS_DELIMITER}${key}`;
      prefixedTranslations[prefixedKey] = value;
    }

    // Merge namespace translations into global translations
    this.translations = {
      ...this.translations,
      ...prefixedTranslations,
    };

    return prefixedTranslations;
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): string[] {
    return this.availableLanguages;
  }

  /**
   * Get all translations
   */
  getTranslations(): TranslationBundle {
    return this.translations;
  }

  /**
   * Update translations (for context sync)
   */
  updateTranslations(translations: TranslationBundle): void {
    this.translations = translations;
  }

  /**
   * Translate a key with full ICU MessageFormat support.
   * Supports nested keys using dot notation (e.g., "common.welcome").
   */
  translate(key: string, values?: TranslationValues): string {
    const translation = getNestedValue(this.translations, key);

    if (!translation) {
      return key;
    }

    // Fast path: no values provided
    if (!values || Object.keys(values).length === 0) {
      return translation;
    }

    // Fast path: simple placeholders only (no ICU syntax)
    if (!hasICUSyntax(translation)) {
      let result = translation;
      Object.entries(values).forEach(([name, value]) => {
        const placeholder = new RegExp(`\\{${name}\\}`, 'g');
        result = result.replace(placeholder, String(value));
      });
      return result;
    }

    // Full ICU MessageFormat parsing
    return this.icuFormatter.format(translation, values);
  }

  /**
   * Create bound translation function
   */
  createTranslateFunction(): TranslationFunction {
    return (key: string, values?: TranslationValues) => {
      return this.translate(key, values);
    };
  }

  /**
   * Get ICU formatter (for provider use)
   */
  getFormatter(): ICUFormatter {
    return this.icuFormatter;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get the configuration
   */
  getConfig(): LocaleflowConfig {
    return this.config;
  }
}
