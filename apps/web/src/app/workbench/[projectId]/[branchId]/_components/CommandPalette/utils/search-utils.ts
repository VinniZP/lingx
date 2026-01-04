import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import type { SearchResult } from '../types';

/** Maximum number of search results to return */
export const DEFAULT_MAX_RESULTS = 10;

/** Number of characters to show around match in snippets */
export const SNIPPET_CONTEXT_LENGTH = 30;

/** Relevance score weights */
export const RELEVANCE_SCORES = {
  /** Bonus for match at start of text */
  START_MATCH: 100,
  /** Bonus for match anywhere in text */
  CONTAINS_MATCH: 50,
  /** Bonus for key name matches (higher priority than content) */
  KEY_NAME_BONUS: 30,
  /** Bonus for exact match */
  EXACT_MATCH: 50,
  /** Maximum bonus for text brevity */
  BREVITY_MAX: 30,
  /** Divisor for text length penalty */
  BREVITY_DIVISOR: 10,
} as const;

/**
 * Calculate relevance score for search results.
 * Higher score = more relevant.
 */
export function calculateRelevance(
  text: string,
  query: string,
  matchType: 'key-name' | 'translation-content'
): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;

  // Exact match at start gets highest score
  if (normalizedText.startsWith(normalizedQuery)) {
    score += RELEVANCE_SCORES.START_MATCH;
  } else if (normalizedText.includes(normalizedQuery)) {
    score += RELEVANCE_SCORES.CONTAINS_MATCH;
  }

  // Key name matches are prioritized over content
  if (matchType === 'key-name') {
    score += RELEVANCE_SCORES.KEY_NAME_BONUS;
  }

  // Shorter matches rank higher (more specific)
  score += Math.max(
    0,
    RELEVANCE_SCORES.BREVITY_MAX - text.length / RELEVANCE_SCORES.BREVITY_DIVISOR
  );

  // Exact match bonus
  if (normalizedText === normalizedQuery) {
    score += RELEVANCE_SCORES.EXACT_MATCH;
  }

  return score;
}

/**
 * Extract a snippet around the match with context.
 * Returns plain text - HTML escaping is handled by React's JSX rendering.
 */
export function extractSnippet(text: string, query: string): string {
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
 * Perform search on translation keys by name or content.
 * Returns results sorted by relevance.
 */
export function performSearch(
  keys: TranslationKey[],
  languages: ProjectLanguage[],
  query: string,
  maxResults: number
): SearchResult[] {
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
          matchedLanguage: lang?.name ?? translation.language,
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
}
