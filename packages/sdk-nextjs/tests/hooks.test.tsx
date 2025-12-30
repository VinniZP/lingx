import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LocaleflowProvider } from '../src/provider';
import { useTranslation } from '../src/hooks/useTranslation';
import { useLanguage } from '../src/hooks/useLanguage';
import { useNamespace } from '../src/hooks/useNamespace';

// Mock fetch for API calls
const mockFetch = vi.fn();

// Static translations for tests
const staticTranslations = {
  greeting: 'Hello, {name}!',
  simple: 'Simple text',
  'common:title': 'Common Title',
  cart_items: '{count, plural, =0 {No items} one {1 item} other {{count} items}}',
};

// Multi-language static data
const multiLangTranslations = {
  en: staticTranslations,
  uk: {
    greeting: 'Привіт, {name}!',
    simple: 'Prostyi tekst',
  },
  de: {
    greeting: 'Hallo, {name}!',
    simple: 'Einfacher Text',
  },
};

describe('useTranslation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Usage', () => {
    it('should return t, ready, and error', async () => {
      const TestComponent = () => {
        const { t, ready, error } = useTranslation();
        return (
          <div>
            <span data-testid="ready">{String(ready)}</span>
            <span data-testid="error">{error?.message || 'none'}</span>
            <span data-testid="translation">{t('simple')}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={staticTranslations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('ready').textContent).toBe('true');
      expect(screen.getByTestId('error').textContent).toBe('none');
      expect(screen.getByTestId('translation').textContent).toBe('Simple text');
    });

    it('should support simple interpolation', () => {
      const TestComponent = () => {
        const { t } = useTranslation();
        return <span data-testid="greeting">{t('greeting', { name: 'World' })}</span>;
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={staticTranslations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('greeting').textContent).toBe('Hello, World!');
    });

    it('should return key for missing translations', () => {
      const TestComponent = () => {
        const { t } = useTranslation();
        return <span data-testid="missing">{t('nonexistent.key')}</span>;
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={staticTranslations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('missing').textContent).toBe('nonexistent.key');
    });
  });

  describe('ICU MessageFormat Support', () => {
    it('should format ICU plural messages via hook', () => {
      const TestComponent = () => {
        const { t } = useTranslation();
        return (
          <div>
            <span data-testid="zero">{t('cart_items', { count: 0 })}</span>
            <span data-testid="one">{t('cart_items', { count: 1 })}</span>
            <span data-testid="many">{t('cart_items', { count: 5 })}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={staticTranslations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('zero').textContent).toBe('No items');
      expect(screen.getByTestId('one').textContent).toBe('1 item');
      expect(screen.getByTestId('many').textContent).toBe('5 items');
    });

    it('should format ICU select messages via hook', () => {
      const translations = {
        greeting:
          '{gender, select, male {He} female {She} other {They}} liked your post',
      };

      const TestComponent = () => {
        const { t } = useTranslation();
        return (
          <div>
            <span data-testid="male">{t('greeting', { gender: 'male' })}</span>
            <span data-testid="female">{t('greeting', { gender: 'female' })}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={translations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('male').textContent).toBe('He liked your post');
      expect(screen.getByTestId('female').textContent).toBe('She liked your post');
    });

    it('should format ICU number messages via hook', () => {
      const translations = {
        count: 'Count: {value, number}',
      };

      const TestComponent = () => {
        const { t } = useTranslation();
        return <span data-testid="count">{t('count', { value: 1234567 })}</span>;
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={translations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('count').textContent).toBe('Count: 1,234,567');
    });
  });

  describe('Namespace Support', () => {
    it('should scope translations to namespace', () => {
      const TestComponent = () => {
        const { t } = useTranslation('common');
        // When using namespace, 'title' should map to 'common:title'
        return <span data-testid="namespaced">{t('title')}</span>;
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={staticTranslations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('namespaced').textContent).toBe('Common Title');
    });

    it('should fall back to non-namespaced key if namespaced key not found', () => {
      const TestComponent = () => {
        const { t } = useTranslation('myns');
        // 'simple' exists without namespace, should fall back
        return <span data-testid="fallback">{t('simple')}</span>;
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={staticTranslations}>
          <TestComponent />
        </LocaleflowProvider>
      );

      expect(screen.getByTestId('fallback').textContent).toBe('Simple text');
    });
  });
});

describe('useLanguage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return current language and available languages', () => {
    const TestComponent = () => {
      const { language, availableLanguages, isChanging } = useLanguage();
      return (
        <div>
          <span data-testid="language">{language}</span>
          <span data-testid="available">{availableLanguages.join(',')}</span>
          <span data-testid="changing">{String(isChanging)}</span>
        </div>
      );
    };

    render(
      <LocaleflowProvider defaultLanguage="en" staticData={multiLangTranslations}>
        <TestComponent />
      </LocaleflowProvider>
    );

    expect(screen.getByTestId('language').textContent).toBe('en');
    expect(screen.getByTestId('available').textContent).toBe('en,uk,de');
    expect(screen.getByTestId('changing').textContent).toBe('false');
  });

  it('should change language via setLanguage', async () => {
    const TestComponent = () => {
      const { language, setLanguage, isChanging } = useLanguage();
      const { t } = useTranslation();

      return (
        <div>
          <span data-testid="language">{language}</span>
          <span data-testid="changing">{String(isChanging)}</span>
          <span data-testid="translation">{t('simple')}</span>
          <button data-testid="switch" onClick={() => setLanguage('uk')}>
            Switch
          </button>
        </div>
      );
    };

    render(
      <LocaleflowProvider defaultLanguage="en" staticData={multiLangTranslations}>
        <TestComponent />
      </LocaleflowProvider>
    );

    expect(screen.getByTestId('language').textContent).toBe('en');
    expect(screen.getByTestId('translation').textContent).toBe('Simple text');

    // Click to switch language
    await act(async () => {
      screen.getByTestId('switch').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('uk');
    });

    expect(screen.getByTestId('translation').textContent).toBe('Prostyi tekst');
  });
});

describe('useNamespace', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track namespace loading state', () => {
    const TestComponent = () => {
      const { isLoaded, isLoading, namespace } = useNamespace('checkout');
      return (
        <div>
          <span data-testid="namespace">{namespace}</span>
          <span data-testid="loaded">{String(isLoaded)}</span>
          <span data-testid="loading">{String(isLoading)}</span>
        </div>
      );
    };

    render(
      <LocaleflowProvider
        defaultLanguage="en"
        staticData={staticTranslations}
        namespaces={['common']}
      >
        <TestComponent />
      </LocaleflowProvider>
    );

    expect(screen.getByTestId('namespace').textContent).toBe('checkout');
    // Namespace should not be loaded initially
    expect(screen.getByTestId('loaded').textContent).toBe('false');
  });

  it('should load namespace on demand', async () => {
    // Namespace fetch returns additional translations
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          'checkout:cart.total': 'Total: $100',
        }),
    });

    global.fetch = mockFetch;

    const TestComponent = () => {
      const { isLoaded, loadNamespace } = useNamespace('checkout');
      const { t } = useTranslation('checkout');

      return (
        <div>
          <span data-testid="loaded">{String(isLoaded)}</span>
          <span data-testid="translation">
            {isLoaded ? t('cart.total') : 'loading'}
          </span>
          <button data-testid="load" onClick={() => loadNamespace()}>
            Load
          </button>
        </div>
      );
    };

    render(
      <LocaleflowProvider
        defaultLanguage="en"
        staticData={staticTranslations}
        localePath="/locales"
      >
        <TestComponent />
      </LocaleflowProvider>
    );

    expect(screen.getByTestId('loaded').textContent).toBe('false');

    // Load namespace
    await act(async () => {
      screen.getByTestId('load').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('loaded').textContent).toBe('true');
    });

    expect(screen.getByTestId('translation').textContent).toBe('Total: $100');
  });
});
