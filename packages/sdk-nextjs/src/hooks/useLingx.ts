'use client';

import { useLingxContext } from '../context/LingxContext';
import type { LingxContextValue } from '../types';

/**
 * Hook to access the full Lingx context
 *
 * @returns The full Lingx context value including:
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
 * const { t, language, setLanguage, ready, error } = useLingx();
 *
 * if (!ready) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return <h1>{t('greeting', { name: 'World' })}</h1>;
 * ```
 */
export function useLingx(): LingxContextValue {
  return useLingxContext();
}
