/**
 * Language Detection Types
 *
 * Based on i18next-browser-languageDetector patterns.
 * Supports pluggable detectors for flexible language detection and caching.
 */

/**
 * Options passed to detector methods
 */
export interface DetectorOptions {
  /** Supported language codes */
  supportedLanguages: string[];

  /** Fallback if no match */
  fallbackLanguage: string;

  /** Cookie name for storage */
  cookieName: string;

  /** Cookie max-age in seconds */
  cookieMaxAge: number;

  /** Cookie domain for cross-subdomain */
  cookieDomain?: string;

  /** localStorage key for storage */
  localStorageKey: string;
}

/**
 * Language detector interface
 *
 * Implement this interface to create custom detectors.
 * Example: API backend, URL hash, subdomain, etc.
 */
export interface LanguageDetector {
  /** Unique name for this detector */
  name: string;

  /**
   * Look up language from this source
   * @returns Language code if found, undefined otherwise
   */
  lookup(options: DetectorOptions): string | undefined;

  /**
   * Cache language to this source (optional)
   * Only called for detectors in the `caches` array
   */
  cacheUserLanguage?(language: string, options: DetectorOptions): void;
}

/**
 * Detection configuration
 */
export interface DetectionConfig {
  /**
   * Detection order - checked in sequence until language found
   * @default ['querystring', 'cookie', 'localStorage', 'navigator']
   */
  order?: string[];

  /**
   * Where to cache language on change
   * @default ['cookie', 'localStorage']
   */
  caches?: string[];

  /**
   * Languages to exclude from caching (e.g., 'cimode' for testing)
   * @default []
   */
  excludeCacheFor?: string[];

  /**
   * Cookie name for storage
   * @default 'lingx-lang'
   */
  cookieName?: string;

  /**
   * Cookie max-age in seconds
   * @default 31536000 (1 year)
   */
  cookieMaxAge?: number;

  /**
   * Cookie domain for cross-subdomain sharing
   * Example: '.example.com' shares across app.example.com and www.example.com
   */
  cookieDomain?: string;

  /**
   * localStorage key for storage
   * @default 'lingx-lang'
   */
  localStorageKey?: string;
}

/**
 * Default detection configuration
 */
export const DEFAULT_DETECTION_CONFIG: Required<Omit<DetectionConfig, 'cookieDomain'>> = {
  order: ['querystring', 'cookie', 'localStorage', 'navigator'],
  caches: ['cookie', 'localStorage'],
  excludeCacheFor: [],
  cookieName: 'lingx-lang',
  cookieMaxAge: 365 * 24 * 60 * 60, // 1 year
  localStorageKey: 'lingx-lang',
};
