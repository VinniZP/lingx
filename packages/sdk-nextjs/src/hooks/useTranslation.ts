'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { useLingxContext } from '../context/LingxContext';
import { NS_DELIMITER } from '../constants';
import type {
  TranslationFunction,
  DynamicTranslationFunction,
  NamespacedTranslationFunction,
  NamespacedDynamicTranslationFunction,
  NamespaceTranslationKeys,
  NamespaceKeys,
  TranslationValues,
  TranslationKey,
} from '../types';

/**
 * Return type for useTranslation hook without namespace (root keys)
 */
export interface UseTranslationReturn {
  /** Translate a root key */
  t: TranslationFunction;
  /** Translate a dynamic root key (from tKey()) */
  td: DynamicTranslationFunction;
  /** Whether translations are ready */
  ready: boolean;
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Return type for useTranslation hook with namespace
 */
export interface UseNamespacedTranslationReturn<NS extends string> {
  /** Translate a namespaced key - only accepts keys valid for this namespace */
  t: NamespacedTranslationFunction<NamespaceTranslationKeys<NS>>;
  /** Translate a dynamic namespaced key (from tKey()) */
  td: NamespacedDynamicTranslationFunction<NamespaceTranslationKeys<NS>>;
  /** Whether translations are ready */
  ready: boolean;
  /** Any error that occurred */
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
 * // Without namespace - t() accepts root keys only
 * const { t, ready } = useTranslation();
 * if (!ready) return <Loading />;
 * return <h1>{t('greeting', { name: 'World' })}</h1>;
 *
 * // With namespace - t() accepts only keys from that namespace
 * const { t } = useTranslation('glossary');
 * return <h1>{t('dialog.title')}</h1>; // Only glossary keys allowed
 * ```
 */
export function useTranslation(): UseTranslationReturn;
export function useTranslation<NS extends keyof NamespaceKeys>(
  namespace: NS
): UseNamespacedTranslationReturn<NS & string>;
export function useTranslation(namespace?: string): UseTranslationReturn | UseNamespacedTranslationReturn<string> {
  const context = useLingxContext();
  const { translations, ready, error, t: contextT, loadNamespace, loadedNamespaces, language } = context;

  // Load namespace on mount if provided and not already loaded
  // Also re-check when language changes (loadedNamespaces is cleared on language change)
  useEffect(() => {
    if (namespace && !loadedNamespaces.has(namespace)) {
      loadNamespace(namespace);
    }
  }, [namespace, loadNamespace, loadedNamespaces, language]);

  /**
   * Translation function that handles namespace key lookup.
   * When a namespace is provided, keys are looked up with namespace␟key format.
   * e.g., useTranslation('glossary') + t('tags.title') → looks up 'glossary␟tags.title'
   */
  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      // Build full key with namespace delimiter if namespace is provided
      const fullKey = namespace ? `${namespace}${NS_DELIMITER}${key}` : key;
      return contextT(fullKey, values);
    },
    [namespace, contextT]
  );

  /**
   * Dynamic translation function for TranslationKey branded strings.
   * Same implementation as t(), but typed to only accept TranslationKey.
   */
  const td = useCallback(
    <T extends string>(key: TranslationKey<T>, values?: TranslationValues) => {
      const stringKey = key as unknown as string;
      const fullKey = namespace ? `${namespace}${NS_DELIMITER}${stringKey}` : stringKey;
      return contextT(fullKey, values);
    },
    [namespace, contextT]
  );

  // Check if namespace is loaded (or no namespace needed)
  const isReady = namespace ? loadedNamespaces.has(namespace) && ready : ready;

  return useMemo(
    () => ({
      t,
      td,
      ready: isReady,
      error,
    }),
    [t, td, isReady, error]
  );
}
