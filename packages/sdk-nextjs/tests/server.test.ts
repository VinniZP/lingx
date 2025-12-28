import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store the original fetch
const mockFetch = vi.fn();

// Mock React cache - React's cache() is for request deduplication
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn, // Pass-through for testing
  };
});

describe('Server Functions', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configureServer', () => {
    it('should set server configuration', async () => {
      const { configureServer, isServerConfigured } = await import(
        '../src/server'
      );

      configureServer({
        apiKey: 'lf_server_key',
        environment: 'production',
        project: 'my-project',
        space: 'frontend',
        defaultLanguage: 'en',
        apiUrl: 'https://api.localeflow.io',
      });

      expect(isServerConfigured()).toBe(true);
    });

    it('should overwrite previous configuration', async () => {
      const { configureServer, getServerConfig } = await import(
        '../src/server'
      );

      configureServer({
        apiKey: 'lf_first_key',
        environment: 'staging',
        project: 'project1',
        space: 'space1',
        defaultLanguage: 'en',
      });

      configureServer({
        apiKey: 'lf_second_key',
        environment: 'production',
        project: 'project2',
        space: 'space2',
        defaultLanguage: 'uk',
      });

      const config = getServerConfig();
      expect(config.apiKey).toBe('lf_second_key');
      expect(config.project).toBe('project2');
    });
  });

  describe('getServerConfig', () => {
    it('should throw error when not configured', async () => {
      vi.resetModules();
      const { getServerConfig } = await import('../src/server');

      expect(() => getServerConfig()).toThrow(
        /Localeflow server not configured/
      );
    });
  });

  describe('getTranslations', () => {
    beforeEach(async () => {
      vi.resetModules();
      const { configureServer } = await import('../src/server');
      configureServer({
        apiKey: 'lf_server_key',
        environment: 'production',
        project: 'my-project',
        space: 'frontend',
        defaultLanguage: 'en',
        apiUrl: 'https://api.localeflow.io',
      });
    });

    it('should fetch translations and return t function', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              greeting: 'Hello, {name}!',
              simple: 'Simple text',
            },
          }),
      });

      const { getTranslations } = await import('../src/server');
      const { t } = await getTranslations();

      expect(t('simple')).toBe('Simple text');
      expect(t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should support namespace parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              'auth:login.title': 'Sign In',
              'auth:login.button': 'Log In',
            },
          }),
      });

      const { getTranslations } = await import('../src/server');
      const { t } = await getTranslations('auth');

      expect(t('login.title')).toBe('Sign In');
    });

    it('should support explicit language parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'uk',
            translations: {
              greeting: 'Привіт, {name}!',
            },
          }),
      });

      const { getTranslations } = await import('../src/server');
      const { t, language } = await getTranslations(undefined, 'uk');

      expect(language).toBe('uk');
      expect(t('greeting', { name: 'Світ' })).toBe('Привіт, Світ!');
    });

    it('should support ICU plural formatting', async () => {
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

      const { getTranslations } = await import('../src/server');
      const { t } = await getTranslations();

      expect(t('cart_items', { count: 0 })).toBe('No items');
      expect(t('cart_items', { count: 1 })).toBe('1 item');
      expect(t('cart_items', { count: 5 })).toBe('5 items');
    });

    it('should support ICU select formatting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              pronoun:
                '{gender, select, male {He} female {She} other {They}}',
            },
          }),
      });

      const { getTranslations } = await import('../src/server');
      const { t } = await getTranslations();

      expect(t('pronoun', { gender: 'male' })).toBe('He');
      expect(t('pronoun', { gender: 'female' })).toBe('She');
      expect(t('pronoun', { gender: 'other' })).toBe('They');
    });

    it('should return key for missing translations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const { getTranslations } = await import('../src/server');
      const { t } = await getTranslations();

      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { getTranslations } = await import('../src/server');

      await expect(getTranslations()).rejects.toThrow(
        'Failed to fetch translations'
      );
    });

    it('should include authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const { getTranslations } = await import('../src/server');
      await getTranslations();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer lf_server_key',
          }),
        })
      );
    });

    it('should build correct API URL with parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
          }),
      });

      const { getTranslations } = await import('../src/server');
      await getTranslations('auth', 'de');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('https://api.localeflow.io');
      expect(calledUrl).toContain('project=my-project');
      expect(calledUrl).toContain('space=frontend');
      expect(calledUrl).toContain('environment=production');
      expect(calledUrl).toContain('lang=de');
      expect(calledUrl).toContain('namespace=auth');
    });
  });

  describe('getAvailableLanguages', () => {
    beforeEach(async () => {
      vi.resetModules();
      const { configureServer } = await import('../src/server');
      configureServer({
        apiKey: 'lf_server_key',
        environment: 'production',
        project: 'my-project',
        space: 'frontend',
        defaultLanguage: 'en',
        apiUrl: 'https://api.localeflow.io',
      });
    });

    it('should fetch available languages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            availableLanguages: ['en', 'uk', 'de', 'fr'],
          }),
      });

      const { getAvailableLanguages } = await import('../src/server');
      const languages = await getAvailableLanguages();

      expect(languages).toEqual(['en', 'uk', 'de', 'fr']);
    });

    it('should return default language if no languages available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { getAvailableLanguages } = await import('../src/server');
      const languages = await getAvailableLanguages();

      expect(languages).toEqual(['en']);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const { getAvailableLanguages } = await import('../src/server');

      await expect(getAvailableLanguages()).rejects.toThrow(
        'Failed to fetch available languages'
      );
    });
  });

  describe('SSG Support', () => {
    beforeEach(async () => {
      vi.resetModules();
      const { configureServer } = await import('../src/server');
      configureServer({
        apiKey: 'lf_server_key',
        environment: 'production',
        project: 'my-project',
        space: 'frontend',
        defaultLanguage: 'en',
        apiUrl: 'https://api.localeflow.io',
      });
    });

    it('should work with generateStaticParams pattern', async () => {
      const languages = ['en', 'uk', 'de'];

      for (const lang of languages) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              language: lang,
              translations: { title: `Title in ${lang}` },
            }),
        });

        const { getTranslations } = await import('../src/server');
        const { t, language } = await getTranslations(undefined, lang);

        expect(language).toBe(lang);
        expect(t('title')).toBe(`Title in ${lang}`);
      }
    });

    it('should support static data for build-time', async () => {
      vi.resetModules();
      const { configureServer, getTranslations } = await import(
        '../src/server'
      );

      // Configure with static data
      configureServer({
        apiKey: 'lf_server_key',
        environment: 'production',
        project: 'my-project',
        space: 'frontend',
        defaultLanguage: 'en',
        staticData: {
          'home.title': 'Welcome Home',
          'home.description': 'This is the home page',
        },
      });

      // Should use static data without fetching
      const { t } = await getTranslations();

      expect(t('home.title')).toBe('Welcome Home');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      vi.resetModules();
      const { configureServer } = await import('../src/server');
      configureServer({
        apiKey: 'lf_server_key',
        environment: 'production',
        project: 'my-project',
        space: 'frontend',
        defaultLanguage: 'en',
        apiUrl: 'https://api.localeflow.io',
      });
    });

    it('should configure Next.js fetch options for revalidation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { key: 'value' },
          }),
      });

      const { getTranslations } = await import('../src/server');
      await getTranslations();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: expect.objectContaining({
            revalidate: expect.any(Number),
            tags: expect.arrayContaining(['translations']),
          }),
        })
      );
    });
  });
});
