import type { TranslationBundle, CacheEntry, CacheOptions } from '../types';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 50;

/**
 * In-memory cache for translations with TTL and LRU eviction
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
   * Get cached translations if not expired.
   * Updates lastAccessed time for LRU tracking.
   */
  get(language: string, namespace?: string): TranslationBundle | null {
    const key = this.getCacheKey(language, namespace);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed time (LRU tracking)
    entry.lastAccessed = Date.now();

    return entry.translations;
  }

  /**
   * Set cached translations with LRU eviction
   */
  set(
    language: string,
    translations: TranslationBundle,
    namespace?: string
  ): void {
    const key = this.getCacheKey(language, namespace);

    // Evict LRU entry if at capacity (skip if updating existing key)
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();

    this.cache.set(key, {
      translations,
      timestamp: now,
      expiresAt: now + this.ttl,
      lastAccessed: now,
    });
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
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
