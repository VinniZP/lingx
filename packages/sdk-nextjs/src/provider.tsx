'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { LocaleflowContext } from './context/LocaleflowContext';
import { LocaleflowClient } from './client/LocaleflowClient';
import type {
  LocaleflowProviderProps,
  LocaleflowConfig,
  LocaleflowContextValue,
  TranslationBundle,
} from './types';

/**
 * LocaleflowProvider component
 * Wraps your application and provides translation context
 *
 * @example
 * ```tsx
 * <LocaleflowProvider
 *   apiKey="lf_live_..."
 *   environment="production"
 *   project="my-app"
 *   space="frontend"
 *   defaultLanguage="en"
 * >
 *   <App />
 * </LocaleflowProvider>
 * ```
 */
export function LocaleflowProvider({
  children,
  fallback,
  ...config
}: LocaleflowProviderProps): ReactNode {
  // Create stable config reference
  const configRef = useRef<LocaleflowConfig>(config);

  // Initialize client - memoized to prevent re-creation
  const client = useMemo(
    () => new LocaleflowClient(configRef.current),
    []
  );

  // State
  const [ready, setReady] = useState(!!config.staticData);
  const [error, setError] = useState<Error | null>(null);
  const [language, setLanguageState] = useState(config.defaultLanguage);
  const [isChanging, setIsChanging] = useState(false);
  const [translations, setTranslations] = useState<TranslationBundle>(
    config.staticData || {}
  );
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [loadedNamespaces, setLoadedNamespaces] = useState<Set<string>>(
    () => new Set(config.namespaces || [])
  );

  // Initialize translations
  useEffect(() => {
    if (config.staticData) {
      // Already initialized with static data
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        await client.init();

        if (mounted) {
          setTranslations(client.getTranslations());
          setAvailableLanguages(client.getAvailableLanguages());
          setReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setReady(true); // Mark as ready so error can be displayed
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [client, config.staticData]);

  // Language change handler
  const setLanguage = useCallback(
    async (lang: string) => {
      if (lang === language || isChanging) return;

      setIsChanging(true);
      setError(null);

      try {
        await client.setLanguage(lang);
        setTranslations(client.getTranslations());
        setLanguageState(lang);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsChanging(false);
      }
    },
    [client, language, isChanging]
  );

  // Namespace loading handler
  const loadNamespace = useCallback(
    async (namespace: string) => {
      if (loadedNamespaces.has(namespace)) return;

      try {
        await client.loadNamespace(namespace);
        setTranslations(client.getTranslations());
        setLoadedNamespaces((prev) => new Set([...prev, namespace]));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client, loadedNamespaces]
  );

  // Translation function with full ICU MessageFormat support
  // Syncs with client's translations state and uses client's translate method
  // This ensures the ICU formatter has access to correct locale
  const t = useCallback(
    (key: string, values?: Record<string, string | number | Date>) => {
      // Sync client's translations with state for reactivity
      // Then use client.translate for ICU formatting support
      client.updateTranslations(translations);
      return client.translate(key, values);
    },
    [client, translations]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<LocaleflowContextValue>(
    () => ({
      language,
      setLanguage,
      availableLanguages,
      isChanging,
      translations,
      loadedNamespaces,
      loadNamespace,
      ready,
      error,
      t,
      config: configRef.current,
    }),
    [
      language,
      setLanguage,
      availableLanguages,
      isChanging,
      translations,
      loadedNamespaces,
      loadNamespace,
      ready,
      error,
      t,
    ]
  );

  // Show fallback while loading
  if (!ready && fallback) {
    return <>{fallback}</>;
  }

  return (
    <LocaleflowContext.Provider value={contextValue}>
      {children}
    </LocaleflowContext.Provider>
  );
}
