'use client';

import { createContext, useContext } from 'react';
import type { LocaleflowContextValue } from '../types';

/**
 * React context for Localeflow translations
 * Created with undefined default (requires Provider)
 */
export const LocaleflowContext = createContext<
  LocaleflowContextValue | undefined
>(undefined);

LocaleflowContext.displayName = 'LocaleflowContext';

/**
 * Hook to access Localeflow context
 * Throws if used outside LocaleflowProvider
 */
export function useLocaleflowContext(): LocaleflowContextValue {
  const context = useContext(LocaleflowContext);

  if (context === undefined) {
    throw new Error(
      'useLocaleflow must be used within a LocaleflowProvider. ' +
        'Wrap your app with <LocaleflowProvider> to use this hook.'
    );
  }

  return context;
}
