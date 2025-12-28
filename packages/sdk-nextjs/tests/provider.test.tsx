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
    const { ready, language, t, error } = useLocaleflow();

    if (!ready) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
      <div>
        <span data-testid="language">{language}</span>
        <span data-testid="translation">{t('greeting')}</span>
      </div>
    );
  };

  describe('Initial Loading', () => {
    it('should render loading state initially when no static data', () => {
      mockFetch.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
          fallback={<div>Loading translations...</div>}
        >
          <TestConsumer />
        </LocaleflowProvider>
      );

      expect(screen.getByText('Loading translations...')).toBeDefined();
    });

    it('should fetch translations and become ready', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
            availableLanguages: ['en', 'uk'],
          }),
      });

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
        >
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
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
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
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
        >
          <TestConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeDefined();
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
        >
          <TestConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeDefined();
        expect(screen.getByText(/Network error/)).toBeDefined();
      });
    });
  });

  describe('Translation Function', () => {
    it('should return key when translation is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
            availableLanguages: ['en'],
          }),
      });

      const MissingKeyConsumer = () => {
        const { ready, t } = useLocaleflow();
        if (!ready) return null;
        return <div data-testid="missing">{t('nonexistent.key')}</div>;
      };

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
        >
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello, {name}!' },
            availableLanguages: ['en'],
          }),
      });

      const InterpolationConsumer = () => {
        const { ready, t } = useLocaleflow();
        if (!ready) return null;
        return (
          <div data-testid="interpolated">
            {t('greeting', { name: 'World' })}
          </div>
        );
      };

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {
              message: '{user} sent {count} messages to {recipient}',
            },
            availableLanguages: ['en'],
          }),
      });

      const MultiInterpolationConsumer = () => {
        const { ready, t } = useLocaleflow();
        if (!ready) return null;
        return (
          <div data-testid="multi">
            {t('message', { user: 'Alice', count: 5, recipient: 'Bob' })}
          </div>
        );
      };

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
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
  });

  describe('API URL Construction', () => {
    it('should construct API URL correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
            availableLanguages: ['en'],
          }),
      });

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="production"
          project="my-project"
          space="frontend"
          defaultLanguage="en"
        >
          <div>Test</div>
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/sdk/translations'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer lf_test_key',
            }),
          })
        );
      });

      // Check query params
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('project=my-project');
      expect(calledUrl).toContain('space=frontend');
      expect(calledUrl).toContain('environment=production');
      expect(calledUrl).toContain('lang=en');
    });

    it('should use custom API URL when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: {},
            availableLanguages: ['en'],
          }),
      });

      render(
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="production"
          project="my-project"
          space="frontend"
          defaultLanguage="en"
          apiUrl="https://custom.api.com"
        >
          <div>Test</div>
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://custom.api.com/sdk/translations'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Context Hook', () => {
    it('should throw error when used outside provider', () => {
      const ConsumerWithoutProvider = () => {
        const { t } = useLocaleflow();
        return <div>{t('test')}</div>;
      };

      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ConsumerWithoutProvider />);
      }).toThrow('useLocaleflow must be used within a LocaleflowProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Language Switching', () => {
    it('should provide setLanguage function', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { greeting: 'Hello' },
            availableLanguages: ['en', 'uk'],
          }),
      });

      const LanguageConsumer = () => {
        const { ready, language, availableLanguages, setLanguage, isChanging } =
          useLocaleflow();
        if (!ready) return <div>Loading...</div>;
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
        <LocaleflowProvider
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
        >
          <LanguageConsumer />
        </LocaleflowProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-lang').textContent).toBe('en');
      });

      expect(screen.getByTestId('available-langs').textContent).toBe('en,uk');
      expect(screen.getByTestId('is-changing').textContent).toBe('false');
    });
  });

  describe('Namespace Loading', () => {
    it('should provide loadNamespace function', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            language: 'en',
            translations: { common: 'Common' },
            availableLanguages: ['en'],
          }),
      });

      const NamespaceConsumer = () => {
        const { ready, loadedNamespaces, loadNamespace } = useLocaleflow();
        if (!ready) return <div>Loading...</div>;
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
          apiKey="lf_test_key"
          environment="test"
          project="test-project"
          space="frontend"
          defaultLanguage="en"
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
});
