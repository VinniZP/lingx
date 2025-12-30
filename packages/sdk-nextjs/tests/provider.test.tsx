import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LocaleflowProvider } from '../src/provider';
import { useLocaleflow } from '../src/hooks/useLocaleflow';

// Mock fetch for API calls
const mockFetch = vi.fn();

describe('LocaleflowProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test Consumer Component
  const TestConsumer = () => {
    const { ready, language, t, error, isLoading } = useLocaleflow();

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
      <div>
        <span data-testid="language">{language}</span>
        <span data-testid="translation">{t('greeting')}</span>
      </div>
    );
  };

  describe('Initial Loading', () => {
    it('should render loading state initially when fetching from localePath', () => {
      mockFetch.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          localePath="/locales"
          fallback={<div>Loading translations...</div>}
        >
          <TestConsumer />
        </LocaleflowProvider>
      );

      expect(screen.getByText('Loading translations...')).toBeDefined();
    });

    it('should fetch translations from localePath and become ready', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ greeting: 'Hello' }),
      });

      render(
        <LocaleflowProvider defaultLanguage="en" localePath="/locales">
          <TestConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('language').textContent).toBe('en');
      });

      expect(screen.getByTestId('translation').textContent).toBe('Hello');
    });
  });

  describe('Static Data', () => {
    it('should use static data when provided', async () => {
      render(
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{ greeting: 'Hello from static' }}
        >
          <TestConsumer />
        </LocaleflowProvider>
      );

      // Should immediately be ready with static data
      await waitFor(() => {
        expect(screen.getByTestId('translation').textContent).toBe(
          'Hello from static'
        );
      });

      // Should not have made a fetch call
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use multi-language static data', async () => {
      const translations = {
        en: { greeting: 'Hello' },
        de: { greeting: 'Hallo' },
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={translations}>
          <TestConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('translation').textContent).toBe('Hello');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      // Retry exhausts after 3 attempts
      mockFetch
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'));

      render(
        <LocaleflowProvider defaultLanguage="en" localePath="/locales">
          <TestConsumer />
        </LocaleflowProvider>
      );

      await waitFor(
        () => {
          expect(screen.getByText(/Error:/)).toBeDefined();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Translation Function', () => {
    it('should return key when translation is missing', async () => {
      const MissingKeyConsumer = () => {
        const { t, isLoading } = useLocaleflow();
        if (isLoading) return null;
        return <div data-testid="missing">{t('nonexistent.key')}</div>;
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={{ greeting: 'Hi' }}>
          <MissingKeyConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('missing').textContent).toBe(
          'nonexistent.key'
        );
      });
    });

    it('should interpolate values in translations', async () => {
      const InterpolationConsumer = () => {
        const { t, isLoading } = useLocaleflow();
        if (isLoading) return null;
        return (
          <div data-testid="interpolated">
            {t('greeting', { name: 'World' })}
          </div>
        );
      };

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{ greeting: 'Hello, {name}!' }}
        >
          <InterpolationConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('interpolated').textContent).toBe(
          'Hello, World!'
        );
      });
    });

    it('should handle multiple interpolation values', async () => {
      const MultiInterpolationConsumer = () => {
        const { t, isLoading } = useLocaleflow();
        if (isLoading) return null;
        return (
          <div data-testid="multi">
            {t('message', { user: 'Alice', count: 5, recipient: 'Bob' })}
          </div>
        );
      };

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{
            message: '{user} sent {count} messages to {recipient}',
          }}
        >
          <MultiInterpolationConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('multi').textContent).toBe(
          'Alice sent 5 messages to Bob'
        );
      });
    });

    it('should support nested keys', async () => {
      const NestedConsumer = () => {
        const { t, isLoading } = useLocaleflow();
        if (isLoading) return null;
        return <div data-testid="nested">{t('common.greeting')}</div>;
      };

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{ common: { greeting: 'Nested Hello' } }}
        >
          <NestedConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('nested').textContent).toBe('Nested Hello');
      });
    });
  });

  describe('API URL Construction', () => {
    it('should construct local path URL correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ greeting: 'Hello' }),
      });

      render(
        <LocaleflowProvider defaultLanguage="en" localePath="/locales">
          <div>Test</div>
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/locales/en.json',
          expect.any(Object)
        );
      });
    });

    it('should use API URL when provided with project config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
          }),
      });

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          apiUrl="https://api.example.com"
          project="my-project"
          space="frontend"
          environment="production"
          localePath="/locales"
        >
          <div>Test</div>
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://api.example.com/sdk/translations'),
          expect.any(Object)
        );
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('project=my-project');
      expect(calledUrl).toContain('space=frontend');
      expect(calledUrl).toContain('environment=production');
    });

    it('should not include Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ greeting: 'Hello' }),
      });

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          apiUrl="https://api.example.com"
          project="my-project"
          space="frontend"
          environment="production"
          localePath="/locales"
        >
          <div>Test</div>
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Context Hook', () => {
    it('should throw error when used outside provider', () => {
      const ConsumerWithoutProvider = () => {
        const { t } = useLocaleflow();
        return <div>{t('test')}</div>;
      };

      // Suppress console.error for expected error
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        render(<ConsumerWithoutProvider />);
      }).toThrow('useLocaleflow must be used within a LocaleflowProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Language Switching', () => {
    it('should provide setLanguage function', async () => {
      const translations = {
        en: { greeting: 'Hello' },
        uk: { greeting: 'Привіт' },
      };

      const LanguageConsumer = () => {
        const {
          language,
          availableLanguages,
          setLanguage,
          isChanging,
          isLoading,
        } = useLocaleflow();
        if (isLoading) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="current-lang">{language}</span>
            <span data-testid="available-langs">
              {availableLanguages.join(',')}
            </span>
            <span data-testid="is-changing">{String(isChanging)}</span>
            <button onClick={() => setLanguage('uk')}>Switch to UK</button>
          </div>
        );
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={translations}>
          <LanguageConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-lang').textContent).toBe('en');
      });

      expect(screen.getByTestId('available-langs').textContent).toBe('en,uk');
      expect(screen.getByTestId('is-changing').textContent).toBe('false');
    });

    it('should switch language using multi-language static data', async () => {
      const translations = {
        en: { greeting: 'Hello' },
        uk: { greeting: 'Привіт' },
      };

      const LanguageSwitchConsumer = () => {
        const { language, t, setLanguage, isLoading, isChanging } =
          useLocaleflow();
        if (isLoading) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="lang">{language}</span>
            <span data-testid="greeting">{t('greeting')}</span>
            <span data-testid="changing">{String(isChanging)}</span>
            <button data-testid="switch-btn" onClick={() => setLanguage('uk')}>
              Switch
            </button>
          </div>
        );
      };

      render(
        <LocaleflowProvider defaultLanguage="en" staticData={translations}>
          <LanguageSwitchConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('greeting').textContent).toBe('Hello');
      });

      // Click switch button
      await act(async () => {
        screen.getByTestId('switch-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('lang').textContent).toBe('uk');
        expect(screen.getByTestId('greeting').textContent).toBe('Привіт');
      });
    });
  });

  describe('Namespace Loading', () => {
    it('should provide loadNamespace function', async () => {
      const NamespaceConsumer = () => {
        const { loadedNamespaces, loadNamespace, isLoading } = useLocaleflow();
        if (isLoading) return <div>Loading...</div>;
        return (
          <div>
            <span data-testid="namespaces">
              {Array.from(loadedNamespaces).join(',')}
            </span>
            <button onClick={() => loadNamespace('auth')}>Load Auth</button>
          </div>
        );
      };

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{ common: 'Common' }}
          namespaces={['common']}
        >
          <NamespaceConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('namespaces').textContent).toBe('common');
      });
    });
  });

  describe('Non-blocking Render', () => {
    it('should be ready immediately with static data', () => {
      const ReadyConsumer = () => {
        const { ready, isLoading } = useLocaleflow();
        return (
          <div>
            <span data-testid="ready">{String(ready)}</span>
            <span data-testid="loading">{String(isLoading)}</span>
          </div>
        );
      };

      render(
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{ greeting: 'Hello' }}
        >
          <ReadyConsumer />
        </LocaleflowProvider>
      );

      // Should be ready immediately
      expect(screen.getByTestId('ready').textContent).toBe('true');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
