'use client';

import { useCallback, useMemo } from 'react';
import { useLocaleflowContext } from '../context/LocaleflowContext';
import type { TranslationFunction, DynamicTranslationFunction, TranslationValues, TranslationKey } from '../types';

/**
 * Return type for useTranslation hook
 */
export interface UseTranslationReturn {
  /**
   * Translate a key with ICU MessageFormat support.
   * Use this for direct string literal keys.
   *
   * @param key - Translation key (string literal)
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
   * Translate a dynamic key (from tKey()).
   * Use this when translating keys stored in variables/arrays.
   *
   * @param key - TranslationKey from tKey()
   * @param values - Values for ICU MessageFormat placeholders
   * @returns Formatted translation string
   *
   * @example
   * ```tsx
   * const items = [{ labelKey: tKey('nav.home') }];
   * const { td } = useTranslation();
   * items.map(item => td(item.labelKey));
   * ```
   */
  td: DynamicTranslationFunction;

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

  /**
   * Dynamic translation function for TranslationKey branded strings.
   * Same implementation as t(), but typed to only accept TranslationKey.
   */
  const td = useCallback<DynamicTranslationFunction>(
    <T extends string>(key: TranslationKey<T>, values?: TranslationValues) => {
      // TranslationKey is just a branded string, so we can use it as a regular key
      const stringKey = key as unknown as string;
      const fullKey = namespace ? `${namespace}:${stringKey}` : stringKey;

      const hasNamespacedKey = fullKey in translations;

      if (!hasNamespacedKey && namespace && stringKey in translations) {
        return contextT(stringKey, values);
      }

      return contextT(fullKey, values);
    },
    [translations, namespace, contextT]
  );

  return useMemo(
    () => ({
      t,
      td,
      ready,
      error,
    }),
    [t, td, ready, error]
  );
}
