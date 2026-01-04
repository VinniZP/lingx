'use client';

import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { useMemo } from 'react';
import type { SearchResult } from '../types';

const DEFAULT_MAX_RESULTS = 10;
const SNIPPET_CONTEXT_LENGTH = 30;

interface UseCommandSearchOptions {
  keys: TranslationKey[];
  languages: ProjectLanguage[];
  query: string;
  maxResults?: number;
}

/**
 * Calculate relevance score for search results.
 * Higher score = more relevant.
 */
function calculateRelevance(
  text: string,
  query: string,
  matchType: 'key-name' | 'translation-content'
): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;

  // Exact match at start gets highest score
  if (normalizedText.startsWith(normalizedQuery)) {
    score += 100;
  } else if (normalizedText.includes(normalizedQuery)) {
    score += 50;
  }

  // Key name matches are prioritized over content
  if (matchType === 'key-name') {
    score += 30;
  }

  // Shorter matches rank higher (more specific)
  score += Math.max(0, 30 - text.length / 10);

  // Exact match bonus
  if (normalizedText === normalizedQuery) {
    score += 50;
  }

  return score;
}

/**
 * Extract a snippet around the match with context.
 */
function extractSnippet(text: string, query: string): string {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) {
    return text.slice(0, SNIPPET_CONTEXT_LENGTH * 2);
  }

  const start = Math.max(0, index - SNIPPET_CONTEXT_LENGTH);
  const end = Math.min(text.length, index + query.length + SNIPPET_CONTEXT_LENGTH);
  let snippet = text.slice(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet += '...';

  return snippet;
}

/**
 * Hook for searching translation keys by name or content.
 * Returns results sorted by relevance.
 */
export function useCommandSearch({
  keys,
  languages,
  query,
  maxResults = DEFAULT_MAX_RESULTS,
}: UseCommandSearchOptions): SearchResult[] {
  return useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const normalizedQuery = trimmedQuery.toLowerCase();
    const results: SearchResult[] = [];
    const seenKeyIds = new Set<string>();

    // First pass: search key names (higher priority)
    for (const key of keys) {
      if (key.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          keyId: key.id,
          keyName: key.name,
          namespace: key.namespace,
          matchType: 'key-name',
          relevanceScore: calculateRelevance(key.name, normalizedQuery, 'key-name'),
        });
        seenKeyIds.add(key.id);
      }
    }

    // Second pass: search translation content (skip keys already matched by name)
    for (const key of keys) {
      if (seenKeyIds.has(key.id)) continue;

      for (const translation of key.translations) {
        if (translation.value.toLowerCase().includes(normalizedQuery)) {
          const lang = languages.find((l) => l.code === translation.language);
          results.push({
            keyId: key.id,
            keyName: key.name,
            namespace: key.namespace,
            matchType: 'translation-content',
            matchedLanguage: lang?.name || translation.language,
            matchedContent: extractSnippet(translation.value, normalizedQuery),
            relevanceScore: calculateRelevance(
              translation.value,
              normalizedQuery,
              'translation-content'
            ),
          });
          seenKeyIds.add(key.id);
          break; // Only include one match per key
        }
      }
    }

    // Sort by relevance and limit results
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxResults);
  }, [keys, languages, query, maxResults]);
}
