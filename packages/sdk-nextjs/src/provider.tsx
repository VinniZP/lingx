'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { LingxContext } from './context/LingxContext';
import { LingxClient, getNestedValue } from './client/LingxClient';
import { hasICUSyntax } from './client/icu-formatter';
import { LanguageDetectorService } from './detection/LanguageDetectorService';
import { NS_DELIMITER } from './constants';
import type {
  LingxProviderProps,
  LingxConfig,
  LingxContextValue,
  TranslationBundle,
  MultiLanguageBundle,
} from './types';

/**
 * Check if staticData is a multi-language bundle
 * Multi-language bundles have language codes as top-level keys with object values
 */
function isMultiLanguageBundle(
  data: TranslationBundle | MultiLanguageBundle | undefined,
  defaultLanguage: string
): data is MultiLanguageBundle {
  if (!data) return false;
  // Check if the default language key exists and its value is an object (not a string)
  const langValue = data[defaultLanguage];
  return langValue !== undefined && typeof langValue === 'object' && langValue !== null;
}

/**
 * Extract translations for a specific language from a multi-language bundle
 */
function getLanguageTranslations(
  data: TranslationBundle | MultiLanguageBundle,
  language: string,
  isMultiLang: boolean
): TranslationBundle {
  if (isMultiLang) {
    return (data as MultiLanguageBundle)[language] || {};
  }
  return data as TranslationBundle;
}

/**
 * LingxProvider component
 * Wraps your application and provides translation context
 *
 * @example
 * ```tsx
 * // With static data (recommended for SSG)
 * import en from '@/locales/en.json';
 *
 * <LingxProvider
 *   defaultLanguage="en"
 *   staticData={en}
 *   localePath="/locales"
 *   availableLanguages={['en', 'de', 'es']}
 * >
 *   <App />
 * </LingxProvider>
 *
 * // Multi-language static data (auto-detects available languages)
 * import en from '@/locales/en.json';
 * import de from '@/locales/de.json';
 *
 * <LingxProvider
 *   defaultLanguage="en"
 *   staticData={{ en, de }}
 * >
 *   <App />
 * </LingxProvider>
 *
 * // With API (optional, falls back to localePath)
 * <LingxProvider
 *   defaultLanguage="en"
 *   localePath="/locales"
 *   apiUrl="https://api.lingx.dev"
 *   project="my-project"
 *   space="main"
 *   environment="production"
 * >
 *   <App />
 * </LingxProvider>
 * ```
 */
export function LingxProvider({
  children,
  fallback,
  ...config
}: LingxProviderProps): ReactNode {
  // Create stable config reference
  const configRef = useRef<LingxConfig>(config);

  // Detect multi-language bundle
  const isMultiLang = useMemo(
    () => isMultiLanguageBundle(config.staticData, config.defaultLanguage),
    [config.staticData, config.defaultLanguage]
  );

  // Store multi-language bundle for language switching
  const multiLangDataRef = useRef<MultiLanguageBundle | null>(
    isMultiLang ? (config.staticData as MultiLanguageBundle) : null
  );

  // Get initial translations for default language
  const initialTranslations = useMemo(() => {
    if (!config.staticData) return {};
    return getLanguageTranslations(config.staticData, config.defaultLanguage, isMultiLang);
  }, [config.staticData, config.defaultLanguage, isMultiLang]);

  // Auto-detect available languages from multi-language bundle
  const initialAvailableLanguages = useMemo(() => {
    if (config.availableLanguages?.length) {
      return config.availableLanguages;
    }
    if (isMultiLang && config.staticData) {
      return Object.keys(config.staticData);
    }
    return [];
  }, [config.availableLanguages, config.staticData, isMultiLang]);

  // Track if staticData was provided (stable reference)
  const hasStaticData = !!config.staticData;

  // Initialize client with single-language translations
  const client = useMemo(() => {
    const clientConfig: LingxConfig = {
      ...configRef.current,
      // Only pass staticData if original config had it
      staticData: hasStaticData ? initialTranslations : undefined,
    };
    return new LingxClient(clientConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTranslations]);

  // Initialize language detector service
  const detectorService = useMemo(() => {
    if (config.detection === false) return null;
    return new LanguageDetectorService(
      typeof config.detection === 'object' ? config.detection : undefined
    );
  }, [config.detection]);

  // State - non-blocking: start ready immediately
  const [ready] = useState(true);
  const [isLoading, setIsLoading] = useState(!config.staticData);
  const [error, setError] = useState<Error | null>(null);
  const [language, setLanguageState] = useState(config.defaultLanguage);
  const [isChanging, setIsChanging] = useState(false);
  const [translations, setTranslations] = useState<TranslationBundle>(initialTranslations);
  // Fallback translations (default language) for missing keys
  const [fallbackTranslations, setFallbackTranslations] = useState<TranslationBundle>(
    isMultiLang
      ? getLanguageTranslations(config.staticData!, config.defaultLanguage, true)
      : initialTranslations
  );
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(initialAvailableLanguages);
  const [loadedNamespaces, setLoadedNamespaces] = useState<Set<string>>(
    () => new Set(config.namespaces || [])
  );

  // Track warned keys to avoid console spam (dev only)
  const warnedKeysRef = useRef<Set<string>>(new Set());

  // Initialize translations (non-blocking)
  useEffect(() => {
    if (config.staticData) {
      // Already initialized with static data
      setIsLoading(false);
      return;
    }

    // No static data - need to load
    if (!config.localePath && !config.apiUrl) {
      // No source configured, stay ready with empty translations
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        await client.init();

        if (mounted) {
          setTranslations(client.getTranslations());
          setAvailableLanguages(client.getAvailableLanguages());
          // Set fallback from client (default language loaded during init)
          setFallbackTranslations(client.getFallbackTranslations());
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [client, config.staticData, config.localePath, config.apiUrl]);

  // Detect saved language on mount
  useEffect(() => {
    if (!detectorService) return;

    const detected = detectorService.detect(
      availableLanguages.length > 0 ? availableLanguages : [config.defaultLanguage],
      config.defaultLanguage
    );

    // If detected language differs from current and is supported, switch to it
    if (detected !== language && detected !== config.defaultLanguage) {
      // Use internal state update to avoid recursive caching
      setLanguageState(detected);

      // Load translations for detected language if not from static data
      if (multiLangDataRef.current && detected in multiLangDataRef.current) {
        const newTranslations = multiLangDataRef.current[detected] || {};
        client.updateTranslations(newTranslations);
        setTranslations(newTranslations);
      } else if (config.localePath || config.apiUrl) {
        // Async load - don't block
        client.setLanguage(detected).then(() => {
          setTranslations(client.getTranslations());
        }).catch(() => {
          // Fallback to default on error
        });
      }
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Language change handler with hybrid loading
  const setLanguage = useCallback(
    async (lang: string) => {
      if (lang === language || isChanging) return;

      setIsChanging(true);
      setError(null);

      try {
        // For multi-language static data, switch without API/fetch
        if (multiLangDataRef.current && lang in multiLangDataRef.current) {
          const newTranslations = multiLangDataRef.current[lang] || {};
          client.updateTranslations(newTranslations);
          setTranslations(newTranslations);
          setLanguageState(lang);
        } else {
          // Use client's hybrid loading (API first, local fallback)
          await client.setLanguage(lang);
          setTranslations(client.getTranslations());
          setLanguageState(lang);
        }

        // Clear loaded namespaces to force reload for new language
        setLoadedNamespaces(new Set());

        // Cache language preference
        detectorService?.cacheLanguage(lang, availableLanguages);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsChanging(false);
      }
    },
    [client, language, isChanging, detectorService, availableLanguages]
  );

  // Namespace loading handler
  const loadNamespace = useCallback(
    async (namespace: string) => {
      if (loadedNamespaces.has(namespace)) return;

      try {
        await client.loadNamespace(namespace);
        setTranslations(client.getTranslations());
        // Also sync fallback translations (client loads namespace for default language too)
        setFallbackTranslations(client.getFallbackTranslations());
        setLoadedNamespaces((prev) => new Set([...prev, namespace]));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client, loadedNamespaces]
  );

  // Translation function - uses state directly (no redundant sync)
  const t = useCallback(
    (key: string, values?: Record<string, string | number | Date>) => {
      let translation = getNestedValue(translations, key);

      // Fallback to default language if missing and not already on default
      if (!translation && language !== config.defaultLanguage) {
        translation = getNestedValue(fallbackTranslations, key);
      }

      // Return key if translation not found in current or fallback
      if (!translation) {
        // Warn about missing key in development (once per key+language combination)
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
          const warnKey = `${language}:${key}`;
          if (!warnedKeysRef.current.has(warnKey)) {
            warnedKeysRef.current.add(warnKey);
            // Parse namespace from key for clearer warning
            const delimiterIndex = key.indexOf(NS_DELIMITER);
            if (delimiterIndex !== -1) {
              const namespace = key.slice(0, delimiterIndex);
              const actualKey = key.slice(delimiterIndex + 1);
              console.warn(
                `[Lingx] Missing translation key: "${actualKey}" in namespace "${namespace}" (language: ${language})`
              );
            } else {
              console.warn(`[Lingx] Missing translation key: "${key}" (language: ${language})`);
            }
          }
        }
        return key;
      }

      // Fast path: no values provided
      if (!values || Object.keys(values).length === 0) {
        return translation;
      }

      // Fast path: simple placeholders only (no ICU syntax)
      if (!hasICUSyntax(translation)) {
        let result = translation;
        Object.entries(values).forEach(([name, value]) => {
          const placeholder = new RegExp(`\\{${name}\\}`, 'g');
          result = result.replace(placeholder, String(value));
        });
        return result;
      }

      // Full ICU MessageFormat - use client's formatter
      return client.getFormatter().format(translation, values);
    },
    [client, translations, fallbackTranslations, language, config.defaultLanguage]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<LingxContextValue>(
    () => ({
      language,
      setLanguage,
      availableLanguages,
      isChanging,
      isLoading,
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
      isLoading,
      translations,
      loadedNamespaces,
      loadNamespace,
      ready,
      error,
      t,
    ]
  );

  // Show fallback only during initial loading (not ready = loading)
  if (isLoading && fallback) {
    return <>{fallback}</>;
  }

  return (
    <LingxContext.Provider value={contextValue}>
      {children}
    </LingxContext.Provider>
  );
}
