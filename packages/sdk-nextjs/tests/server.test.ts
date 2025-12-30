import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Server Functions', () => {
  beforeEach(async () => {
    // Reset module state between tests
    vi.resetModules();
    const { resetServerConfig } = await import('../src/server');
    resetServerConfig();
  });

  describe('configureServer', () => {
    it('should configure server with static data', async () => {
      const { configureServer, isServerConfigured, getServerConfig } =
        await import('../src/server');

      const config = {
        defaultLanguage: 'en',
        staticData: { greeting: 'Hello' },
      };

      configureServer(config);

      expect(isServerConfigured()).toBe(true);
      expect(getServerConfig()?.defaultLanguage).toBe('en');
    });

    it('should overwrite previous configuration', async () => {
      const { configureServer, getServerConfig } = await import(
        '../src/server'
      );

      configureServer({
        defaultLanguage: 'en',
        staticData: { key: 'first' },
      });

      configureServer({
        defaultLanguage: 'uk',
        staticData: { key: 'second' },
      });

      const config = getServerConfig();
      expect(config?.defaultLanguage).toBe('uk');
    });
  });

  describe('getServerConfig', () => {
    it('should return null when not configured', async () => {
      vi.resetModules();
      const { getServerConfig } = await import('../src/server');

      expect(getServerConfig()).toBeNull();
    });
  });

  describe('getTranslations', () => {
    it('should return translation function using staticData option', async () => {
      const { getTranslations } = await import('../src/server');

      const { t, language } = await getTranslations({
        staticData: { greeting: 'Hello' },
        language: 'en',
      });

      expect(language).toBe('en');
      expect(t('greeting')).toBe('Hello');
    });

    it('should return key for missing translations', async () => {
      const { getTranslations } = await import('../src/server');

      const { t } = await getTranslations({
        staticData: { greeting: 'Hello' },
        language: 'en',
      });

      expect(t('missing.key')).toBe('missing.key');
    });

    it('should interpolate placeholders', async () => {
      const { getTranslations } = await import('../src/server');

      const { t } = await getTranslations({
        staticData: { greeting: 'Hello, {name}!' },
        language: 'en',
      });

      expect(t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should support ICU plural formatting', async () => {
      const { getTranslations } = await import('../src/server');

      const { t } = await getTranslations({
        staticData: {
          items:
            '{count, plural, =0 {No items} one {1 item} other {{count} items}}',
        },
        language: 'en',
      });

      expect(t('items', { count: 0 })).toBe('No items');
      expect(t('items', { count: 1 })).toBe('1 item');
      expect(t('items', { count: 5 })).toBe('5 items');
    });

    it('should support ICU select formatting', async () => {
      const { getTranslations } = await import('../src/server');

      const { t } = await getTranslations({
        staticData: {
          greeting:
            '{gender, select, male {He} female {She} other {They}} liked it',
        },
        language: 'en',
      });

      expect(t('greeting', { gender: 'male' })).toBe('He liked it');
      expect(t('greeting', { gender: 'female' })).toBe('She liked it');
    });

    it('should support nested keys', async () => {
      const { getTranslations } = await import('../src/server');

      const { t } = await getTranslations({
        staticData: {
          common: {
            greeting: 'Hello',
            farewell: 'Goodbye',
          },
        },
        language: 'en',
      });

      expect(t('common.greeting')).toBe('Hello');
      expect(t('common.farewell')).toBe('Goodbye');
    });

    it('should support multi-language bundles', async () => {
      const { getTranslations } = await import('../src/server');

      const translations = {
        en: { greeting: 'Hello' },
        de: { greeting: 'Hallo' },
      };

      const enResult = await getTranslations({
        staticData: translations,
        language: 'en',
        defaultLanguage: 'en',
      });

      const deResult = await getTranslations({
        staticData: translations,
        language: 'de',
        defaultLanguage: 'en',
      });

      expect(enResult.t('greeting')).toBe('Hello');
      expect(deResult.t('greeting')).toBe('Hallo');
    });

    it('should use namespace prefix when provided', async () => {
      const { getTranslations } = await import('../src/server');

      const { t } = await getTranslations({
        staticData: { 'auth:login': 'Sign In' },
        language: 'en',
        namespace: 'auth',
      });

      expect(t('login')).toBe('Sign In');
    });

    it('should throw error when no static data is provided', async () => {
      const { getTranslations } = await import('../src/server');

      await expect(getTranslations()).rejects.toThrow(
        'No translations provided'
      );
    });

    it('should fall back to global config if no staticData option', async () => {
      const { configureServer, getTranslations } = await import(
        '../src/server'
      );

      configureServer({
        defaultLanguage: 'en',
        staticData: { greeting: 'From global config' },
      });

      const { t } = await getTranslations();

      expect(t('greeting')).toBe('From global config');
    });

    it('should support legacy signature (namespace, language)', async () => {
      const { configureServer, getTranslations } = await import(
        '../src/server'
      );

      configureServer({
        defaultLanguage: 'en',
        staticData: {
          'common:welcome': 'Welcome!',
        },
      });

      const { t } = await getTranslations('common', 'en');

      expect(t('welcome')).toBe('Welcome!');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return languages from multi-language bundle', async () => {
      const { getAvailableLanguages } = await import('../src/server');

      const translations = {
        en: { greeting: 'Hello' },
        de: { greeting: 'Hallo' },
        fr: { greeting: 'Bonjour' },
      };

      const languages = getAvailableLanguages(translations);

      expect(languages).toEqual(['en', 'de', 'fr']);
    });

    it('should return languages from global config', async () => {
      const { configureServer, getAvailableLanguages } = await import(
        '../src/server'
      );

      configureServer({
        defaultLanguage: 'en',
        availableLanguages: ['en', 'de', 'fr', 'es'],
      });

      const languages = getAvailableLanguages();

      expect(languages).toEqual(['en', 'de', 'fr', 'es']);
    });

    it('should return default language if nothing configured', async () => {
      const { getAvailableLanguages } = await import('../src/server');

      const languages = getAvailableLanguages();

      expect(languages).toEqual(['en']);
    });
  });

  describe('SSG Support', () => {
    it('should work with generateStaticParams pattern', async () => {
      const { getTranslations, getAvailableLanguages } = await import(
        '../src/server'
      );

      const translations = {
        en: { title: 'Welcome' },
        de: { title: 'Willkommen' },
      };

      // Simulate generateStaticParams
      const languages = getAvailableLanguages(translations);
      const staticParams = languages.map((locale) => ({ locale }));

      expect(staticParams).toEqual([{ locale: 'en' }, { locale: 'de' }]);

      // Simulate page render for each locale
      for (const { locale } of staticParams) {
        const { t, language } = await getTranslations({
          staticData: translations,
          language: locale,
          defaultLanguage: 'en',
        });

        expect(language).toBe(locale);
        expect(t('title')).toBeTruthy();
      }
    });

    it('should support static data for build-time', async () => {
      vi.resetModules();
      const { configureServer, getTranslations } = await import(
        '../src/server'
      );

      // Configure with static data
      configureServer({
        defaultLanguage: 'en',
        staticData: {
          'home.title': 'Welcome Home',
          'home.description': 'This is the home page',
        },
      });

      // Should use static data without fetching
      const { t } = await getTranslations();

      expect(t('home.title')).toBe('Welcome Home');
    });
  });
});
