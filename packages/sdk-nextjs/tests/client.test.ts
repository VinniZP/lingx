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

  const defaultConfig = {
    apiKey: 'lf_test_key',
    environment: 'test',
    project: 'test-project',
    space: 'frontend',
    defaultLanguage: 'en',
  };

  describe('Constructor', () => {
    it('should initialize with config', () => {
      const client = new LocaleflowClient(defaultConfig);
      expect(client.getLanguage()).toBe('en');
      expect(client.getTranslations()).toEqual({});
    });

    it('should initialize with static data', () => {
      const staticData = { greeting: 'Hello' };
      const client = new LocaleflowClient({
        ...defaultConfig,
        staticData,
      });
      expect(client.getTranslations()).toEqual(staticData);
    });
  });

  describe('init()', () => {
    it('should fetch translations on init', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
            availableLanguages: ['en', 'uk'],
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.getTranslations()).toEqual({ greeting: 'Hello' });
      expect(client.getAvailableLanguages()).toEqual(['en', 'uk']);
    });

    it('should skip fetch when static data is provided', async () => {
      const client = new LocaleflowClient({
        ...defaultConfig,
        staticData: { greeting: 'Static Hello' },
      });

      await client.init();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(client.getTranslations()).toEqual({ greeting: 'Static Hello' });
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new LocaleflowClient(defaultConfig);

      await expect(client.init()).rejects.toThrow(
        'Failed to fetch translations: 500 Internal Server Error'
      );
    });
  });

  describe('setLanguage()', () => {
    it('should change language and fetch new translations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'en',
              translations: { greeting: 'Hello' },
              availableLanguages: ['en', 'uk'],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'uk',
              translations: { greeting: 'Привіт' },
            }),
        });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.getLanguage()).toBe('en');

      await client.setLanguage('uk');

      expect(client.getLanguage()).toBe('uk');
      expect(client.getTranslations()).toEqual({ greeting: 'Привіт' });
    });

    it('should not fetch when language is same', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      await client.setLanguage('en');

      // Only one fetch call (init), not a second for setLanguage
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadNamespace()', () => {
    it('should load and merge namespace translations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'en',
              translations: { common: 'Common' },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'en',
              translations: { auth_login: 'Login' },
            }),
        });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      await client.loadNamespace('auth');

      expect(client.getTranslations()).toEqual({
        common: 'Common',
        auth_login: 'Login',
      });
    });
  });

  describe('translate()', () => {
    it('should return translation for existing key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.translate('greeting')).toBe('Hello');
    });

    it('should return key when translation is missing', () => {
      const client = new LocaleflowClient(defaultConfig);
      expect(client.translate('missing.key')).toBe('missing.key');
    });

    it('should interpolate simple placeholders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello, {name}!' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.translate('greeting', { name: 'World' })).toBe(
        'Hello, World!'
      );
    });

    it('should interpolate multiple placeholders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              message: '{sender} sent {count} messages to {recipient}',
            },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(
        client.translate('message', {
          sender: 'Alice',
          count: 3,
          recipient: 'Bob',
        })
      ).toBe('Alice sent 3 messages to Bob');
    });

    it('should handle repeated placeholders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { echo: '{word} {word} {word}' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.translate('echo', { word: 'test' })).toBe('test test test');
    });

    it('should handle Date values in interpolation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { date: 'Date: {date}' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      const date = new Date('2025-12-27');
      const result = client.translate('date', { date });

      // Should convert Date to string
      expect(result).toContain('Date:');
      expect(result).toContain('2025');
    });
  });

  describe('ICU MessageFormat Support', () => {
    it('should format ICU plural messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              cart_items:
                '{count, plural, =0 {No items} one {1 item} other {{count} items}}',
            },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.translate('cart_items', { count: 0 })).toBe('No items');
      expect(client.translate('cart_items', { count: 1 })).toBe('1 item');
      expect(client.translate('cart_items', { count: 5 })).toBe('5 items');
    });

    it('should format ICU select messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              greeting:
                '{gender, select, male {He} female {She} other {They}} liked your post',
            },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

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

    it('should format ICU number messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { count: 'Count: {value, number}' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(client.translate('count', { value: 1234567 })).toBe(
        'Count: 1,234,567'
      );
    });

    it('should format ICU date messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { update: 'Updated: {date, date, medium}' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      const date = new Date('2025-12-28T10:30:00Z');
      const result = client.translate('update', { date });

      expect(result).toContain('Dec');
      expect(result).toContain('2025');
    });

    it('should use simple interpolation for non-ICU messages (performance)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello, {name}!' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      // Simple placeholder should still work (uses fast path)
      expect(client.translate('greeting', { name: 'World' })).toBe(
        'Hello, World!'
      );
    });

    it('should update ICU formatter when language changes', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'en',
              translations: {
                count: 'Count: {value, number}',
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'de',
              translations: {
                count: 'Anzahl: {value, number}',
              },
            }),
        });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

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
    it('should create a bound translate function', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello, {name}!' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      const t = client.createTranslateFunction();

      expect(t('greeting', { name: 'World' })).toBe('Hello, World!');
    });
  });

  describe('API URL construction', () => {
    it('should use default API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sdk/translations'),
        expect.any(Object)
      );
    });

    it('should use custom API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const client = new LocaleflowClient({
        ...defaultConfig,
        apiUrl: 'https://api.example.com',
      });
      await client.init();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com/sdk/translations'),
        expect.any(Object)
      );
    });

    it('should include all required query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      const calledUrl = mockFetch.mock.calls[0][0] as string;

      expect(calledUrl).toContain('project=test-project');
      expect(calledUrl).toContain('space=frontend');
      expect(calledUrl).toContain('environment=test');
      expect(calledUrl).toContain('lang=en');
    });

    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer lf_test_key',
          }),
        })
      );
    });
  });

  describe('Caching', () => {
    it('should cache translations after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
          }),
      });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      // Fetch same language again - should use cache
      await client.setLanguage('en');

      // Only one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'en',
              translations: { greeting: 'Hello' },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: 'en',
              translations: { greeting: 'Hello Updated' },
            }),
        });

      const client = new LocaleflowClient(defaultConfig);
      await client.init();

      // Clear cache
      client.clearCache();

      // Force refetch by changing and changing back
      await client.fetchTranslations('en');

      // Should have fetched again
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
