import type {
  LocaleflowConfig,
  TranslationBundle,
  SdkTranslationsResponse,
  TranslationValues,
  TranslationFunction,
} from '../types';
import { TranslationCache } from './cache';

/**
 * Core Localeflow client for API communication and translation management
 */
export class LocaleflowClient {
  private config: LocaleflowConfig;
  private cache: TranslationCache;
  private translations: TranslationBundle = {};
  private availableLanguages: string[] = [];
  private currentLanguage: string;

  constructor(config: LocaleflowConfig) {
    this.config = config;
    this.cache = new TranslationCache();
    this.currentLanguage = config.defaultLanguage;

    // Initialize with static data if provided
    if (config.staticData) {
      this.translations = config.staticData;
      this.cache.set(config.defaultLanguage, config.staticData);
    }
  }

  /**
   * Get the API base URL
   */
  private getApiUrl(): string {
    return this.config.apiUrl || '/api';
  }

  /**
   * Build query string for SDK endpoint
   */
  private buildQueryString(params: Record<string, string>): string {
    return new URLSearchParams(params).toString();
  }

  /**
   * Fetch translations from API
   */
  async fetchTranslations(
    language: string,
    namespace?: string
  ): Promise<SdkTranslationsResponse> {
    // Check cache first
    const cached = this.cache.get(language, namespace);
    if (cached) {
      return {
        language,
        translations: cached,
        availableLanguages: this.availableLanguages,
      };
    }

    const params: Record<string, string> = {
      project: this.config.project,
      space: this.config.space,
      environment: this.config.environment,
      lang: language,
    };

    if (namespace) {
      params.namespace = namespace;
    }

    const url = `${this.getApiUrl()}/sdk/translations?${this.buildQueryString(params)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch translations: ${response.status} ${response.statusText}`
      );
    }

    const data: SdkTranslationsResponse = await response.json();

    // Update cache
    this.cache.set(language, data.translations, namespace);

    // Update available languages if provided
    if (data.availableLanguages) {
      this.availableLanguages = data.availableLanguages;
    }

    return data;
  }

  /**
   * Load initial translations
   */
  async init(): Promise<void> {
    // Skip fetch if we have static data
    if (this.config.staticData) {
      return;
    }

    const response = await this.fetchTranslations(this.currentLanguage);
    this.translations = response.translations;

    if (response.availableLanguages) {
      this.availableLanguages = response.availableLanguages;
    }
  }

  /**
   * Change current language
   */
  async setLanguage(language: string): Promise<void> {
    if (language === this.currentLanguage) return;

    const response = await this.fetchTranslations(language);
    this.translations = response.translations;
    this.currentLanguage = language;
  }

  /**
   * Load additional namespace
   */
  async loadNamespace(namespace: string): Promise<TranslationBundle> {
    const response = await this.fetchTranslations(
      this.currentLanguage,
      namespace
    );
    // Merge namespace translations
    this.translations = {
      ...this.translations,
      ...response.translations,
    };
    return response.translations;
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
   * Basic translate function (without ICU formatting)
   * ICU formatting is added in Task 21
   */
  translate(key: string, values?: TranslationValues): string {
    let translation = this.translations[key];

    if (!translation) {
      // Return key if translation not found
      return key;
    }

    // Simple interpolation for {placeholder} syntax
    if (values) {
      Object.entries(values).forEach(([name, value]) => {
        const placeholder = new RegExp(`\\{${name}\\}`, 'g');
        translation = translation.replace(placeholder, String(value));
      });
    }

    return translation;
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
