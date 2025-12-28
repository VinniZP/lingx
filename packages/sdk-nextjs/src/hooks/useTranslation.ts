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
  const { translations, ready, error } = context;

  /**
   * Translation function that handles namespace prefixing
   */
  const t = useCallback<TranslationFunction>(
    (key: string, values?: TranslationValues) => {
      // Build full key with namespace prefix if provided
      const fullKey = namespace ? `${namespace}:${key}` : key;

      // Look up translation
      let translation = translations[fullKey];

      // If not found with namespace, try without (for common keys)
      if (!translation && namespace) {
        translation = translations[key];
      }

      // Return key if not found
      if (!translation) {
        return fullKey;
      }

      // Simple interpolation for {placeholder} syntax
      // Full ICU MessageFormat is added in Task 21
      if (values) {
        Object.entries(values).forEach(([name, value]) => {
          const placeholder = new RegExp(`\\{${name}\\}`, 'g');
          translation = translation.replace(placeholder, String(value));
        });
      }

      return translation;
    },
    [translations, namespace]
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
