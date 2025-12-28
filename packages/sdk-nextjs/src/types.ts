/**
 * Configuration for LocaleflowProvider
 */
export interface LocaleflowConfig {
  /** API key for authentication (lf_live_...) */
  apiKey: string;
  /** Environment slug (e.g., 'production', 'staging') */
  environment: string;
  /** Default language code (e.g., 'en') */
  defaultLanguage: string;
  /** Project slug */
  project: string;
  /** Space slug */
  space: string;
  /** Fallback language when translation is missing */
  fallbackLanguage?: string;
  /** Namespaces to load initially */
  namespaces?: string[];
  /** Static translations for SSG (pre-loaded) */
  staticData?: TranslationBundle;
  /** API base URL (defaults to relative /api) */
  apiUrl?: string;
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
 * Bundle of translations keyed by translation key
 */
export type TranslationBundle = Record<string, string>;

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
  /** Translations for current language */
  translations: TranslationBundle;
  /** Loaded namespaces */
  loadedNamespaces: Set<string>;
  /** Load a namespace */
  loadNamespace: (namespace: string) => Promise<void>;
  /** Whether SDK is ready */
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
