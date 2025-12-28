'use client';

import { useMemo } from 'react';
import { useLocaleflowContext } from '../context/LocaleflowContext';

/**
 * Return type for useLanguage hook
 */
export interface UseLanguageReturn {
  /**
   * Current language code
   */
  language: string;

  /**
   * Change the current language
   * Fetches new translations and updates all t() calls
   *
   * @param lang - Language code to switch to
   * @returns Promise that resolves when language change is complete
   *
   * @example
   * ```tsx
   * const { setLanguage } = useLanguage();
   * await setLanguage('uk'); // Switch to Ukrainian
   * ```
   */
  setLanguage: (lang: string) => Promise<void>;

  /**
   * Available language codes for the project
   */
  availableLanguages: string[];

  /**
   * Whether a language change is in progress
   */
  isChanging: boolean;
}

/**
 * Hook for language management and switching.
 *
 * @returns Language state and controls
 *
 * @example
 * ```tsx
 * const { language, setLanguage, availableLanguages, isChanging } = useLanguage();
 *
 * return (
 *   <select
 *     value={language}
 *     disabled={isChanging}
 *     onChange={(e) => setLanguage(e.target.value)}
 *   >
 *     {availableLanguages.map((lang) => (
 *       <option key={lang} value={lang}>{lang}</option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useLanguage(): UseLanguageReturn {
  const context = useLocaleflowContext();

  return useMemo(
    () => ({
      language: context.language,
      setLanguage: context.setLanguage,
      availableLanguages: context.availableLanguages,
      isChanging: context.isChanging,
    }),
    [
      context.language,
      context.setLanguage,
      context.availableLanguages,
      context.isChanging,
    ]
  );
}
