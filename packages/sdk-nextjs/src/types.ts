import type { DetectionConfig } from './detection/types.js';

// Re-export detection types for convenience
export type { DetectionConfig } from './detection/types.js';

/**
 * Configuration for LocaleflowProvider
 */
export interface LocaleflowConfig {
  /** Default language code (e.g., 'en') */
  defaultLanguage: string;

  /**
   * Static translations for default language (immediate load).
   * Can be a single language bundle or multi-language bundle.
   * For multi-language: { en: { ... }, de: { ... } }
   */
  staticData?: TranslationBundle | MultiLanguageBundle;

  /**
   * Path to local JSON translation files (e.g., '/locales').
   * Used for dynamic loading of non-default languages.
   * Files should be named {lang}.json (e.g., /locales/de.json)
   */
  localePath?: string;

  /** Available languages (auto-detected from staticData if multi-language) */
  availableLanguages?: string[];

  /** Fallback language when translation is missing */
  fallbackLanguage?: string;

  /** Namespaces to load initially */
  namespaces?: string[];

  // ---- API Configuration (optional) ----

  /** API base URL for fetching translations (optional - falls back to localePath) */
  apiUrl?: string;

  /** Project slug (required if using API) */
  project?: string;

  /** Space slug (required if using API) */
  space?: string;

  /** Environment slug (required if using API) */
  environment?: string;

  // ---- Retry Configuration ----

  /** Retry configuration for API/network failures */
  retry?: {
    /** Maximum retry attempts (default: 3) */
    maxAttempts?: number;
    /** Base delay in ms for exponential backoff (default: 1000) */
    baseDelay?: number;
    /** Maximum delay in ms (default: 10000) */
    maxDelay?: number;
  };

  // ---- Language Detection & Persistence ----

  /**
   * Language detection configuration.
   * Set to false to disable detection (always use defaultLanguage).
   * Default: enabled with cookie + localStorage detection and caching.
   */
  detection?: DetectionConfig | false;
}

/**
 * Props for LocaleflowProvider component
 */
export interface LocaleflowProviderProps extends LocaleflowConfig {
  children: React.ReactNode;
  /** Loading fallback while translations load */
  fallback?: React.ReactNode;
}

/**
 * Translation values for interpolation and ICU formatting
 */
export type TranslationValues = Record<string, string | number | Date>;

/**
 * Translation function with ICU MessageFormat support
 */
export type TranslationFunction = (
  key: string,
  values?: TranslationValues
) => string;

/**
 * Nested translation value - can be a string or nested object
 */
export type NestedTranslationValue = string | { [key: string]: NestedTranslationValue };

/**
 * Bundle of translations - supports both flat and nested structures
 * Flat: { "common.welcome": "Hello" }
 * Nested: { common: { welcome: "Hello" } }
 */
export type TranslationBundle = Record<string, NestedTranslationValue>;

/**
 * Multi-language translation bundle keyed by language code
 */
export type MultiLanguageBundle = Record<string, TranslationBundle>;

/**
 * SDK API response format
 */
export interface SdkTranslationsResponse {
  language: string;
  translations: TranslationBundle;
  availableLanguages?: string[];
}

/**
 * Localeflow context value
 */
export interface LocaleflowContextValue {
  /** Current language code */
  language: string;
  /** Set current language */
  setLanguage: (lang: string) => Promise<void>;
  /** Available language codes */
  availableLanguages: string[];
  /** Whether language change is in progress */
  isChanging: boolean;
  /** Whether translations are currently loading */
  isLoading: boolean;
  /** Translations for current language */
  translations: TranslationBundle;
  /** Loaded namespaces */
  loadedNamespaces: Set<string>;
  /** Load a namespace */
  loadNamespace: (namespace: string) => Promise<void>;
  /** Whether SDK is ready (always true - non-blocking) */
  ready: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Translation function */
  t: TranslationFunction;
  /** SDK configuration */
  config: LocaleflowConfig;
}

/**
 * Cache entry for translations
 */
export interface CacheEntry {
  translations: TranslationBundle;
  timestamp: number;
  expiresAt: number;
  /** Last access time for LRU eviction */
  lastAccessed: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum cache entries */
  maxEntries?: number;
}
