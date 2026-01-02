'use client';

import { createContext, useContext } from 'react';
import type { LingxContextValue } from '../types';

/**
 * React context for Lingx translations
 * Created with undefined default (requires Provider)
 */
export const LingxContext = createContext<
  LingxContextValue | undefined
>(undefined);

LingxContext.displayName = 'LingxContext';

/**
 * Hook to access Lingx context
 * Throws if used outside LingxProvider
 */
export function useLingxContext(): LingxContextValue {
  const context = useContext(LingxContext);

  if (context === undefined) {
    throw new Error(
      'useLingx must be used within a LingxProvider. ' +
        'Wrap your app with <LingxProvider> to use this hook.'
    );
  }

  return context;
}
