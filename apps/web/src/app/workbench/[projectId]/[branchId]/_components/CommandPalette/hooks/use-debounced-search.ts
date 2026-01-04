'use client';

import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { useEffect, useMemo, useState } from 'react';
import type { SearchResult } from '../types';
import { DEFAULT_MAX_RESULTS, performSearch } from '../utils/search-utils';

/** Debounce delay in milliseconds for search input */
const SEARCH_DEBOUNCE_MS = 150;

interface UseDebouncedSearchOptions {
  keys: TranslationKey[];
  languages: ProjectLanguage[];
  query: string;
  maxResults?: number;
  debounceMs?: number;
}

/**
 * Hook for searching translation keys with debouncing.
 * Combines debouncing for input responsiveness with memoization for cache efficiency.
 *
 * For non-debounced search, use useCommandSearch instead.
 */
export function useDebouncedSearch({
  keys,
  languages,
  query,
  maxResults = DEFAULT_MAX_RESULTS,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: UseDebouncedSearchOptions): SearchResult[] {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query to avoid excessive recalculations on fast typing
  useEffect(() => {
    // For empty queries, use minimal delay to clear immediately
    // For non-empty queries, use the configured debounce delay
    const delay = query.trim() ? debounceMs : 0;

    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Memoize the search results based on debounced query
  return useMemo(
    () => performSearch(keys, languages, debouncedQuery, maxResults),
    [keys, languages, debouncedQuery, maxResults]
  );
}
