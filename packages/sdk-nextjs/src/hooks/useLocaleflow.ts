'use client';

import { useLocaleflowContext } from '../context/LocaleflowContext';
import type { LocaleflowContextValue } from '../types';

/**
 * Hook to access the full Localeflow context
 *
 * @returns The full Localeflow context value including:
 * - `t`: Translation function
 * - `language`: Current language code
 * - `setLanguage`: Function to change language
 * - `availableLanguages`: Array of available language codes
 * - `isChanging`: Whether a language change is in progress
 * - `ready`: Whether translations are loaded
 * - `error`: Any error that occurred
 * - `translations`: Current translation bundle
 * - `loadedNamespaces`: Set of loaded namespace names
 * - `loadNamespace`: Function to load a namespace
 * - `config`: SDK configuration
 *
 * @example
 * ```tsx
 * const { t, language, setLanguage, ready, error } = useLocaleflow();
 *
 * if (!ready) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return <h1>{t('greeting', { name: 'World' })}</h1>;
 * ```
 */
export function useLocaleflow(): LocaleflowContextValue {
  return useLocaleflowContext();
}
