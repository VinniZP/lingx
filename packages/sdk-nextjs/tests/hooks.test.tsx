import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LocaleflowProvider } from '../src/provider';
import { useTranslation } from '../src/hooks/useTranslation';
import { useLanguage } from '../src/hooks/useLanguage';
import { useNamespace } from '../src/hooks/useNamespace';

// Mock fetch for API calls
const mockFetch = vi.fn();

const defaultConfig = {
  apiKey: 'lf_test_key',
  environment: 'test',
  project: 'test-project',
  space: 'frontend',
  defaultLanguage: 'en',
};

const mockTranslations = {
  language: 'en',
  translations: {
    greeting: 'Hello, {name}!',
    simple: 'Simple text',
    'common:title': 'Common Title',
    cart_items: '{count, plural, =0 {No items} one {1 item} other {{count} items}}',
  },
  availableLanguages: ['en', 'uk', 'de'],
};

const setupMockFetch = (response = mockTranslations) => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  });
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
      setupMockFetch();

      const TestComponent = () => {
        const { t, ready, error } = useTranslation();
        return (
          <div>
            <span data-testid="ready">{String(ready)}</span>
            <span data-testid="error">{error?.message || 'none'}</span>
            <span data-testid="translation">{ready ? t('simple') : 'loading'}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ready').textContent).toBe('true');
      });

      expect(screen.getByTestId('error').textContent).toBe('none');
      expect(screen.getByTestId('translation').textContent).toBe('Simple text');
    });

    it('should support simple interpolation', async () => {
      setupMockFetch();

      const TestComponent = () => {
        const { t, ready } = useTranslation();
        if (!ready) return null;
        return <span data-testid="greeting">{t('greeting', { name: 'World' })}</span>;
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('greeting').textContent).toBe('Hello, World!');
      });
    });

    it('should return key for missing translations', async () => {
      setupMockFetch();

      const TestComponent = () => {
        const { t, ready } = useTranslation();
        if (!ready) return null;
        return <span data-testid="missing">{t('nonexistent.key')}</span>;
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('missing').textContent).toBe('nonexistent.key');
      });
    });
  });

  describe('ICU MessageFormat Support', () => {
    it('should format ICU plural messages via hook', async () => {
      setupMockFetch();

      const TestComponent = () => {
        const { t, ready } = useTranslation();
        if (!ready) return null;
        return (
          <div>
            <span data-testid="zero">{t('cart_items', { count: 0 })}</span>
            <span data-testid="one">{t('cart_items', { count: 1 })}</span>
            <span data-testid="many">{t('cart_items', { count: 5 })}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('zero').textContent).toBe('No items');
      });

      expect(screen.getByTestId('one').textContent).toBe('1 item');
      expect(screen.getByTestId('many').textContent).toBe('5 items');
    });

    it('should format ICU select messages via hook', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              greeting:
                '{gender, select, male {He} female {She} other {They}} liked your post',
            },
            availableLanguages: ['en'],
          }),
      });

      const TestComponent = () => {
        const { t, ready } = useTranslation();
        if (!ready) return null;
        return (
          <div>
            <span data-testid="male">{t('greeting', { gender: 'male' })}</span>
            <span data-testid="female">{t('greeting', { gender: 'female' })}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('male').textContent).toBe('He liked your post');
      });

      expect(screen.getByTestId('female').textContent).toBe('She liked your post');
    });

    it('should format ICU number messages via hook', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              count: 'Count: {value, number}',
            },
            availableLanguages: ['en'],
          }),
      });

      const TestComponent = () => {
        const { t, ready } = useTranslation();
        if (!ready) return null;
        return <span data-testid="count">{t('count', { value: 1234567 })}</span>;
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('Count: 1,234,567');
      });
    });
  });

  describe('Namespace Support', () => {
    it('should scope translations to namespace', async () => {
      setupMockFetch();

      const TestComponent = () => {
        const { t, ready } = useTranslation('common');
        if (!ready) return null;
        // When using namespace, 'title' should map to 'common:title'
        return <span data-testid="namespaced">{t('title')}</span>;
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('namespaced').textContent).toBe('Common Title');
      });
    });

    it('should fall back to non-namespaced key if namespaced key not found', async () => {
      setupMockFetch();

      const TestComponent = () => {
        const { t, ready } = useTranslation('myns');
        if (!ready) return null;
        // 'simple' exists without namespace, should fall back
        return <span data-testid="fallback">{t('simple')}</span>;
      };

      render(
        <LocaleflowProvider {...defaultConfig}>
          <TestComponent />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback').textContent).toBe('Simple text');
      });
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

  it('should return current language and available languages', async () => {
    setupMockFetch();

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
      <LocaleflowProvider {...defaultConfig}>
        <TestComponent />
      </LocaleflowProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('en');
    });

    expect(screen.getByTestId('available').textContent).toBe('en,uk,de');
    expect(screen.getByTestId('changing').textContent).toBe('false');
  });

  it('should change language via setLanguage', async () => {
    // First call returns English translations
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTranslations),
    });

    // Second call returns Ukrainian translations
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          language: 'uk',
          translations: { simple: 'Prostyi tekst' },
          availableLanguages: ['en', 'uk', 'de'],
        }),
    });

    global.fetch = mockFetch;

    const TestComponent = () => {
      const { language, setLanguage, isChanging } = useLanguage();
      const { t, ready } = useTranslation();

      return (
        <div>
          <span data-testid="language">{language}</span>
          <span data-testid="changing">{String(isChanging)}</span>
          <span data-testid="translation">{ready ? t('simple') : 'loading'}</span>
          <button data-testid="switch" onClick={() => setLanguage('uk')}>
            Switch
          </button>
        </div>
      );
    };

    render(
      <LocaleflowProvider {...defaultConfig}>
        <TestComponent />
      </LocaleflowProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('en');
    });

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

  it('should track namespace loading state', async () => {
    setupMockFetch();

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
      <LocaleflowProvider {...defaultConfig}>
        <TestComponent />
      </LocaleflowProvider>
    );

    // Wait for provider to initialize
    await waitFor(() => {
      expect(screen.getByTestId('namespace').textContent).toBe('checkout');
    });

    // Namespace should not be loaded initially
    expect(screen.getByTestId('loaded').textContent).toBe('false');
  });

  it('should load namespace on demand', async () => {
    // Initial fetch for default language
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTranslations),
    });

    // Namespace fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          language: 'en',
          translations: {
            'checkout:cart.total': 'Total: $100',
          },
        }),
    });

    global.fetch = mockFetch;

    const TestComponent = () => {
      const { isLoaded, loadNamespace } = useNamespace('checkout');
      const { t, ready } = useTranslation('checkout');

      return (
        <div>
          <span data-testid="loaded">{String(isLoaded)}</span>
          <span data-testid="translation">
            {ready && isLoaded ? t('cart.total') : 'loading'}
          </span>
          <button data-testid="load" onClick={() => loadNamespace()}>
            Load
          </button>
        </div>
      );
    };

    render(
      <LocaleflowProvider {...defaultConfig}>
        <TestComponent />
      </LocaleflowProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loaded').textContent).toBe('false');
    });

    // Load namespace
    await act(async () => {
      screen.getByTestId('load').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('loaded').textContent).toBe('true');
    });

    expect(screen.getByTestId('translation').textContent).toBe('Total: $100');
  });

  it('should support autoLoad option', async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTranslations),
    });

    // Auto-load namespace fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          language: 'en',
          translations: {
            'settings:theme': 'Theme Settings',
          },
        }),
    });

    global.fetch = mockFetch;

    const TestComponent = () => {
      const { isLoaded, isLoading } = useNamespace('settings', { autoLoad: true });
      const { t, ready } = useTranslation('settings');

      return (
        <div>
          <span data-testid="loaded">{String(isLoaded)}</span>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="translation">
            {ready && isLoaded ? t('theme') : 'loading'}
          </span>
        </div>
      );
    };

    render(
      <LocaleflowProvider {...defaultConfig}>
        <TestComponent />
      </LocaleflowProvider>
    );

    // Should auto-load and eventually be loaded
    await waitFor(
      () => {
        expect(screen.getByTestId('loaded').textContent).toBe('true');
      },
      { timeout: 2000 }
    );

    expect(screen.getByTestId('translation').textContent).toBe('Theme Settings');
  });
});
