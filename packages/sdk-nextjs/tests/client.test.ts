import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleflowClient } from '../src/client/LocaleflowClient';

const mockFetch = vi.fn();

describe('LocaleflowClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Config with static data only
  const staticConfig = {
    defaultLanguage: 'en',
    staticData: { greeting: 'Hello' },
  };

  // Config with local path for dynamic loading
  const localConfig = {
    defaultLanguage: 'en',
    localePath: '/locales',
  };

  // Config with API (optional, fallback to local)
  const apiConfig = {
    defaultLanguage: 'en',
    localePath: '/locales',
    apiUrl: 'https://api.example.com',
    project: 'test-project',
    space: 'frontend',
    environment: 'test',
    // Fast retry for tests
    retry: {
      maxAttempts: 3,
      baseDelay: 10,
      maxDelay: 50,
    },
  };

  describe('Constructor', () => {
    it('should initialize with config', () => {
      const client = new LocaleflowClient(localConfig);
      expect(client.getLanguage()).toBe('en');
      expect(client.getTranslations()).toEqual({});
    });

    it('should initialize with static data', () => {
      const client = new LocaleflowClient(staticConfig);
      expect(client.getTranslations()).toEqual({ greeting: 'Hello' });
    });

    it('should initialize with available languages', () => {
      const client = new LocaleflowClient({
        ...staticConfig,
        availableLanguages: ['en', 'de', 'fr'],
      });
      expect(client.getAvailableLanguages()).toEqual(['en', 'de', 'fr']);
    });
  });

  describe('init()', () => {
    it('should skip fetch when static data is provided', async () => {
      const client = new LocaleflowClient(staticConfig);
      await client.init();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(client.getTranslations()).toEqual({ greeting: 'Hello' });
    });

    it('should fetch translations from local path on init', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ greeting: 'Hello from local' }),
      });

      const client = new LocaleflowClient(localConfig);
      await client.init();

      expect(mockFetch).toHaveBeenCalledWith(
        '/locales/en.json',
        expect.any(Object)
      );
      expect(client.getTranslations()).toEqual({ greeting: 'Hello from local' });
    });

    it('should try API first then fallback to local on failure', async () => {
      // API fails 3 times (retry exhausted), then local succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('API unavailable'))
        .mockRejectedValueOnce(new Error('API unavailable'))
        .mockRejectedValueOnce(new Error('API unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'Local fallback' }),
        });

      const client = new LocaleflowClient(apiConfig);
      await client.init();

      // 3 API attempts + 1 local = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(client.getTranslations()).toEqual({ greeting: 'Local fallback' });
    });

    it('should use API response when successful', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'From API' },
            availableLanguages: ['en', 'uk'],
          }),
      });

      const client = new LocaleflowClient(apiConfig);
      await client.init();

      expect(client.getTranslations()).toEqual({ greeting: 'From API' });
      expect(client.getAvailableLanguages()).toEqual(['en', 'uk']);
    });

    it('should throw on complete failure (API and local)', async () => {
      // API fails 3 times (retry), then local fails 3 times (retry)
      mockFetch
        .mockRejectedValueOnce(new Error('API failed'))
        .mockRejectedValueOnce(new Error('API failed'))
        .mockRejectedValueOnce(new Error('API failed'))
        .mockRejectedValueOnce(new Error('Local failed'))
        .mockRejectedValueOnce(new Error('Local failed'))
        .mockRejectedValueOnce(new Error('Local failed'));

      const client = new LocaleflowClient(apiConfig);

      await expect(client.init()).rejects.toThrow('Failed to load translations');
    });
  });

  describe('setLanguage()', () => {
    it('should change language and fetch new translations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'Hello' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'Привіт' }),
        });

      const client = new LocaleflowClient(localConfig);
      await client.init();

      expect(client.getLanguage()).toBe('en');

      await client.setLanguage('uk');

      expect(client.getLanguage()).toBe('uk');
      expect(client.getTranslations()).toEqual({ greeting: 'Привіт' });
    });

    it('should not fetch when language is same', async () => {
      const client = new LocaleflowClient(staticConfig);
      await client.init();

      await client.setLanguage('en');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('loadNamespace()', () => {
    it('should load and merge namespace translations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ common: 'Common' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ auth_login: 'Login' }),
        });

      const client = new LocaleflowClient(localConfig);
      await client.init();

      await client.loadNamespace('auth');

      expect(client.getTranslations()).toEqual({
        common: 'Common',
        auth_login: 'Login',
      });
    });
  });

  describe('translate()', () => {
    it('should return translation for existing key', () => {
      const client = new LocaleflowClient(staticConfig);
      expect(client.translate('greeting')).toBe('Hello');
    });

    it('should return key when translation is missing', () => {
      const client = new LocaleflowClient(staticConfig);
      expect(client.translate('missing.key')).toBe('missing.key');
    });

    it('should interpolate simple placeholders', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { greeting: 'Hello, {name}!' },
      });

      expect(client.translate('greeting', { name: 'World' })).toBe(
        'Hello, World!'
      );
    });

    it('should interpolate multiple placeholders', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { message: '{sender} sent {count} messages to {recipient}' },
      });

      expect(
        client.translate('message', {
          sender: 'Alice',
          count: 3,
          recipient: 'Bob',
        })
      ).toBe('Alice sent 3 messages to Bob');
    });

    it('should handle repeated placeholders', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { echo: '{word} {word} {word}' },
      });

      expect(client.translate('echo', { word: 'test' })).toBe('test test test');
    });

    it('should handle Date values in interpolation', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { date: 'Date: {date}' },
      });

      const date = new Date('2025-12-27');
      const result = client.translate('date', { date });

      expect(result).toContain('Date:');
      expect(result).toContain('2025');
    });
  });

  describe('ICU MessageFormat Support', () => {
    it('should format ICU plural messages', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: {
          cart_items:
            '{count, plural, =0 {No items} one {1 item} other {{count} items}}',
        },
      });

      expect(client.translate('cart_items', { count: 0 })).toBe('No items');
      expect(client.translate('cart_items', { count: 1 })).toBe('1 item');
      expect(client.translate('cart_items', { count: 5 })).toBe('5 items');
    });

    it('should format ICU select messages', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: {
          greeting:
            '{gender, select, male {He} female {She} other {They}} liked your post',
        },
      });

      expect(client.translate('greeting', { gender: 'male' })).toBe(
        'He liked your post'
      );
      expect(client.translate('greeting', { gender: 'female' })).toBe(
        'She liked your post'
      );
      expect(client.translate('greeting', { gender: 'other' })).toBe(
        'They liked your post'
      );
    });

    it('should format ICU number messages', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { count: 'Count: {value, number}' },
      });

      expect(client.translate('count', { value: 1234567 })).toBe(
        'Count: 1,234,567'
      );
    });

    it('should format ICU date messages', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { update: 'Updated: {date, date, medium}' },
      });

      const date = new Date('2025-12-28T10:30:00Z');
      const result = client.translate('update', { date });

      expect(result).toContain('Dec');
      expect(result).toContain('2025');
    });

    it('should use simple interpolation for non-ICU messages (performance)', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { greeting: 'Hello, {name}!' },
      });

      expect(client.translate('greeting', { name: 'World' })).toBe(
        'Hello, World!'
      );
    });

    it('should update ICU formatter when language changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 'Anzahl: {value, number}' }),
      });

      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        localePath: '/locales',
        staticData: { count: 'Count: {value, number}' },
      });

      expect(client.translate('count', { value: 1234567 })).toBe(
        'Count: 1,234,567'
      );

      await client.setLanguage('de');

      // German uses . as thousands separator
      expect(client.translate('count', { value: 1234567 })).toBe(
        'Anzahl: 1.234.567'
      );
    });
  });

  describe('createTranslateFunction()', () => {
    it('should create a bound translate function', () => {
      const client = new LocaleflowClient({
        defaultLanguage: 'en',
        staticData: { greeting: 'Hello, {name}!' },
      });

      const t = client.createTranslateFunction();

      expect(t('greeting', { name: 'World' })).toBe('Hello, World!');
    });
  });

  describe('API URL construction', () => {
    it('should use API URL with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const client = new LocaleflowClient(apiConfig);
      await client.init();

      const calledUrl = mockFetch.mock.calls[0][0] as string;

      expect(calledUrl).toContain('https://api.example.com/sdk/translations');
      expect(calledUrl).toContain('project=test-project');
      expect(calledUrl).toContain('space=frontend');
      expect(calledUrl).toContain('environment=test');
      expect(calledUrl).toContain('lang=en');
    });

    it('should not include Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const client = new LocaleflowClient(apiConfig);
      await client.init();

      const options = mockFetch.mock.calls[0][1] as RequestInit;

      expect(options.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Caching', () => {
    it('should cache translations after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ greeting: 'Hello' }),
      });

      const client = new LocaleflowClient(localConfig);
      await client.init();

      // Set same language again - should use cache
      await client.setLanguage('en');

      // Only one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'Hello' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'Hello Updated' }),
        });

      const client = new LocaleflowClient(localConfig);
      await client.init();

      // Clear cache
      client.clearCache();

      // Force refetch
      await client.loadTranslations('en');

      // Should have fetched again
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests for same language', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ greeting: 'Hello' }),
          }), 100)
        )
      );

      const client = new LocaleflowClient(localConfig);

      // Make concurrent requests
      const [result1, result2, result3] = await Promise.all([
        client.loadTranslations('en'),
        client.loadTranslations('en'),
        client.loadTranslations('en'),
      ]);

      // Only one fetch call due to deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
