import type { TranslationBundle, CacheEntry, CacheOptions } from '../types';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 50;

/**
 * In-memory cache for translations with TTL support
 */
export class TranslationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;
  private maxEntries: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? DEFAULT_TTL;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  /**
   * Generate cache key from parameters
   */
  private getCacheKey(language: string, namespace?: string): string {
    return namespace ? `${language}:${namespace}` : language;
  }

  /**
   * Get cached translations if not expired
   */
  get(language: string, namespace?: string): TranslationBundle | null {
    const key = this.getCacheKey(language, namespace);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.translations;
  }

  /**
   * Set cached translations
   */
  set(
    language: string,
    translations: TranslationBundle,
    namespace?: string
  ): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const key = this.getCacheKey(language, namespace);
    const now = Date.now();

    this.cache.set(key, {
      translations,
      timestamp: now,
      expiresAt: now + this.ttl,
    });
  }

  /**
   * Clear all cached translations
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear translations for a specific language
   */
  clearLanguage(language: string): void {
    for (const key of this.cache.keys()) {
      if (key === language || key.startsWith(`${language}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}
