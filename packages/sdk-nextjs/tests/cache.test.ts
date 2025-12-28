import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranslationCache } from '../src/client/cache';

describe('TranslationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve translations', () => {
      const cache = new TranslationCache();
      const translations = { greeting: 'Hello' };

      cache.set('en', translations);

      expect(cache.get('en')).toEqual(translations);
    });

    it('should return null for non-existent key', () => {
      const cache = new TranslationCache();

      expect(cache.get('en')).toBeNull();
    });

    it('should store translations with namespace', () => {
      const cache = new TranslationCache();
      const translations = { login: 'Login' };

      cache.set('en', translations, 'auth');

      expect(cache.get('en', 'auth')).toEqual(translations);
      expect(cache.get('en')).toBeNull();
    });

    it('should separate different namespaces', () => {
      const cache = new TranslationCache();
      const commonTranslations = { common: 'Common' };
      const authTranslations = { auth: 'Auth' };

      cache.set('en', commonTranslations, 'common');
      cache.set('en', authTranslations, 'auth');

      expect(cache.get('en', 'common')).toEqual(commonTranslations);
      expect(cache.get('en', 'auth')).toEqual(authTranslations);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', () => {
      const cache = new TranslationCache({ ttl: 1000 }); // 1 second
      const translations = { greeting: 'Hello' };

      cache.set('en', translations);
      expect(cache.get('en')).toEqual(translations);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      expect(cache.get('en')).toBeNull();
    });

    it('should not expire before TTL', () => {
      const cache = new TranslationCache({ ttl: 1000 });
      const translations = { greeting: 'Hello' };

      cache.set('en', translations);

      // Advance time but stay within TTL
      vi.advanceTimersByTime(500);

      expect(cache.get('en')).toEqual(translations);
    });

    it('should use default TTL of 5 minutes', () => {
      const cache = new TranslationCache();
      const translations = { greeting: 'Hello' };

      cache.set('en', translations);

      // Advance 4 minutes - should still be cached
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(cache.get('en')).toEqual(translations);

      // Advance past 5 minutes total - should be expired
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(cache.get('en')).toBeNull();
    });
  });

  describe('Max Entries', () => {
    it('should evict oldest entry when at capacity', () => {
      const cache = new TranslationCache({ maxEntries: 2 });

      cache.set('en', { en: 'English' });
      vi.advanceTimersByTime(1); // Ensure different timestamps
      cache.set('uk', { uk: 'Ukrainian' });
      vi.advanceTimersByTime(1);
      cache.set('de', { de: 'German' });

      // 'en' should be evicted (oldest)
      expect(cache.get('en')).toBeNull();
      expect(cache.get('uk')).toEqual({ uk: 'Ukrainian' });
      expect(cache.get('de')).toEqual({ de: 'German' });
    });

    it('should use default max entries of 50', () => {
      const cache = new TranslationCache();

      // Add 50 entries
      for (let i = 0; i < 50; i++) {
        cache.set(`lang${i}`, { key: `value${i}` });
      }

      expect(cache.size).toBe(50);

      // Add one more - should evict oldest
      cache.set('lang50', { key: 'value50' });

      expect(cache.size).toBe(50);
      expect(cache.get('lang0')).toBeNull();
      expect(cache.get('lang50')).toEqual({ key: 'value50' });
    });
  });

  describe('Clear Operations', () => {
    it('should clear all entries', () => {
      const cache = new TranslationCache();

      cache.set('en', { en: 'English' });
      cache.set('uk', { uk: 'Ukrainian' });
      cache.set('de', { de: 'German' });

      cache.clear();

      expect(cache.get('en')).toBeNull();
      expect(cache.get('uk')).toBeNull();
      expect(cache.get('de')).toBeNull();
      expect(cache.size).toBe(0);
    });

    it('should clear entries for specific language', () => {
      const cache = new TranslationCache();

      cache.set('en', { common: 'Common' });
      cache.set('en', { auth: 'Auth' }, 'auth');
      cache.set('uk', { common: 'Common UK' });

      cache.clearLanguage('en');

      expect(cache.get('en')).toBeNull();
      expect(cache.get('en', 'auth')).toBeNull();
      expect(cache.get('uk')).toEqual({ common: 'Common UK' });
    });

    it('should clear language with namespace entries', () => {
      const cache = new TranslationCache();

      cache.set('en', { a: 'A' }, 'ns1');
      cache.set('en', { b: 'B' }, 'ns2');
      cache.set('en', { c: 'C' });

      cache.clearLanguage('en');

      expect(cache.get('en', 'ns1')).toBeNull();
      expect(cache.get('en', 'ns2')).toBeNull();
      expect(cache.get('en')).toBeNull();
    });
  });

  describe('Size', () => {
    it('should track cache size', () => {
      const cache = new TranslationCache();

      expect(cache.size).toBe(0);

      cache.set('en', { en: 'English' });
      expect(cache.size).toBe(1);

      cache.set('uk', { uk: 'Ukrainian' });
      expect(cache.size).toBe(2);

      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('should count namespaced entries separately', () => {
      const cache = new TranslationCache();

      cache.set('en', { common: 'Common' });
      cache.set('en', { auth: 'Auth' }, 'auth');
      cache.set('en', { admin: 'Admin' }, 'admin');

      expect(cache.size).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty translations', () => {
      const cache = new TranslationCache();

      cache.set('en', {});

      expect(cache.get('en')).toEqual({});
    });

    it('should overwrite existing entry', () => {
      const cache = new TranslationCache();

      cache.set('en', { greeting: 'Hello' });
      cache.set('en', { greeting: 'Hi' });

      expect(cache.get('en')).toEqual({ greeting: 'Hi' });
    });

    it('should handle unicode language codes', () => {
      const cache = new TranslationCache();
      const translations = { greeting: 'Hello' };

      cache.set('zh-TW', translations);

      expect(cache.get('zh-TW')).toEqual(translations);
    });
  });
});
