'use client';

import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { useMemo } from 'react';
import type { SearchResult } from '../types';
import { DEFAULT_MAX_RESULTS, performSearch } from '../utils/search-utils';

interface UseCommandSearchOptions {
  keys: TranslationKey[];
  languages: ProjectLanguage[];
  query: string;
  maxResults?: number;
}

/**
 * Hook for searching translation keys by name or content.
 * Returns results sorted by relevance.
 *
 * For debounced search (better for real-time input), use useDebouncedSearch instead.
 */
export function useCommandSearch({
  keys,
  languages,
  query,
  maxResults = DEFAULT_MAX_RESULTS,
}: UseCommandSearchOptions): SearchResult[] {
  return useMemo(
    () => performSearch(keys, languages, query, maxResults),
    [keys, languages, query, maxResults]
  );
}
