'use client';

import { useCallback, useMemo } from 'react';
import { useLocaleflowContext } from '../context/LocaleflowContext';
import type { TranslationFunction, TranslationValues } from '../types';

/**
 * Return type for useTranslation hook
 */
export interface UseTranslationReturn {
  /**
   * Translate a key with ICU MessageFormat support.
   * Supports: plural, select, selectordinal, number, date, time formatting.
   *
   * @param key - Translation key (without namespace prefix if using namespace)
   * @param values - Values for ICU MessageFormat placeholders
   * @returns Formatted translation string
   *
   * @example
   * ```tsx
   * const { t } = useTranslation();
   * t('greeting', { name: 'World' }); // "Hello, World!"
   * t('cart_items', { count: 5 }); // "5 items" (with ICU plural)
   * ```
   */
  t: TranslationFunction;

  /**
   * Whether translations are ready to use
   */
  ready: boolean;

  /**
   * Any error that occurred during loading
   */
  error: Error | null;
}

/**
 * Main translation hook for accessing translations.
 *
 * @param namespace - Optional namespace to scope translations
 * @returns Translation function and status
 *
 * @example
 * ```tsx
 * // Without namespace
 * const { t, ready } = useTranslation();
 * if (!ready) return <Loading />;
 * return <h1>{t('greeting', { name: 'World' })}</h1>;
 *
 * // With namespace
 * const { t } = useTranslation('auth');
 * return <h1>{t('login.title')}</h1>; // Looks up 'auth:login.title'
 * ```
 */
export function useTranslation(namespace?: string): UseTranslationReturn {
  const context = useLocaleflowContext();
  const { translations, ready, error, t: contextT } = context;

  /**
   * Translation function that handles namespace prefixing.
   * Delegates to context's t function for full ICU MessageFormat support.
   */
  const t = useCallback<TranslationFunction>(
    (key: string, values?: TranslationValues) => {
      // Build full key with namespace prefix if provided
      const fullKey = namespace ? `${namespace}:${key}` : key;

      // Check if namespaced key exists
      const hasNamespacedKey = fullKey in translations;

      // If namespaced key doesn't exist, try without namespace (for common keys)
      if (!hasNamespacedKey && namespace && key in translations) {
        // Use the non-namespaced key with ICU formatting from context
        return contextT(key, values);
      }

      // Use the full key (with namespace prefix) with ICU formatting from context
      return contextT(fullKey, values);
    },
    [translations, namespace, contextT]
  );

  return useMemo(
    () => ({
      t,
      ready,
      error,
    }),
    [t, ready, error]
  );
}
