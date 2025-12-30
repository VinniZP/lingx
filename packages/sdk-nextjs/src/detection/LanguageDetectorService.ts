/**
 * Language Detector Service
 *
 * Manages language detection and caching using pluggable detectors.
 * Based on i18next-browser-languageDetector patterns.
 */

import type {
  LanguageDetector,
  DetectorOptions,
  DetectionConfig,
} from './types.js';
import { DEFAULT_DETECTION_CONFIG } from './types.js';
import { builtInDetectors } from './detectors.js';

/**
 * Service for detecting and caching user language preference
 */
export class LanguageDetectorService {
  private detectors: Map<string, LanguageDetector>;
  private config: Required<Omit<DetectionConfig, 'cookieDomain'>> & Pick<DetectionConfig, 'cookieDomain'>;

  constructor(config: DetectionConfig = {}) {
    this.config = {
      ...DEFAULT_DETECTION_CONFIG,
      ...config,
    };
    this.detectors = new Map();

    // Register all built-in detectors
    for (const detector of builtInDetectors) {
      this.addDetector(detector);
    }
  }

  /**
   * Add a custom detector
   *
   * @example
   * ```ts
   * service.addDetector({
   *   name: 'api',
   *   lookup: () => fetchUserLanguageFromAPI(),
   *   cacheUserLanguage: (lang) => saveUserLanguageToAPI(lang),
   * });
   * ```
   */
  addDetector(detector: LanguageDetector): void {
    this.detectors.set(detector.name, detector);
  }

  /**
   * Remove a detector by name
   */
  removeDetector(name: string): void {
    this.detectors.delete(name);
  }

  /**
   * Get a detector by name
   */
  getDetector(name: string): LanguageDetector | undefined {
    return this.detectors.get(name);
  }

  /**
   * Detect language from configured sources
   *
   * Checks detectors in order until a supported language is found.
   * Returns fallback if no match.
   */
  detect(supportedLanguages: string[], fallbackLanguage: string): string {
    const options = this.buildOptions(supportedLanguages, fallbackLanguage);

    for (const name of this.config.order) {
      const detector = this.detectors.get(name);
      if (!detector) continue;

      const found = detector.lookup(options);
      if (found && supportedLanguages.includes(found)) {
        return found;
      }
    }

    return fallbackLanguage;
  }

  /**
   * Cache language to configured storage locations
   *
   * Only caches to detectors listed in `caches` config.
   * Skips languages in `excludeCacheFor`.
   */
  cacheLanguage(language: string, supportedLanguages: string[] = []): void {
    // Skip excluded languages
    if (this.config.excludeCacheFor.includes(language)) {
      return;
    }

    const options = this.buildOptions(supportedLanguages, language);

    for (const name of this.config.caches) {
      const detector = this.detectors.get(name);
      if (detector?.cacheUserLanguage) {
        detector.cacheUserLanguage(language, options);
      }
    }
  }

  /**
   * Clear cached language from all cache locations
   */
  clearCache(supportedLanguages: string[] = []): void {
    const options = this.buildOptions(supportedLanguages, '');

    for (const name of this.config.caches) {
      const detector = this.detectors.get(name);

      // For cookie, set expired cookie
      if (name === 'cookie' && detector?.cacheUserLanguage) {
        // Setting empty value with max-age=0 clears the cookie
        if (typeof document !== 'undefined') {
          let cookie = `${this.config.cookieName}=; path=/; max-age=0`;
          if (this.config.cookieDomain) {
            cookie += `; domain=${this.config.cookieDomain}`;
          }
          document.cookie = cookie;
        }
      }

      // For localStorage/sessionStorage
      if ((name === 'localStorage' || name === 'sessionStorage') && typeof window !== 'undefined') {
        try {
          const storage = name === 'localStorage' ? localStorage : sessionStorage;
          storage.removeItem(this.config.localStorageKey);
        } catch {
          // Storage may be blocked
        }
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DetectionConfig {
    return { ...this.config };
  }

  /**
   * Build detector options from config
   */
  private buildOptions(supportedLanguages: string[], fallbackLanguage: string): DetectorOptions {
    return {
      supportedLanguages,
      fallbackLanguage,
      cookieName: this.config.cookieName,
      cookieMaxAge: this.config.cookieMaxAge,
      cookieDomain: this.config.cookieDomain,
      localStorageKey: this.config.localStorageKey,
    };
  }
}

/**
 * Create a language detector service with default configuration
 */
export function createLanguageDetector(config?: DetectionConfig): LanguageDetectorService {
  return new LanguageDetectorService(config);
}
