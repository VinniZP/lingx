'use client';

import type { UnifiedSuggestion } from '@/types';
import { useCallback, useMemo, useState } from 'react';
import {
  getAIProviderDisplayName,
  getModelDisplayName,
  useAIConfigs,
  useAITranslate,
} from './use-ai-translation';
import {
  getProviderDisplayName,
  useMTConfigs,
  useMTTranslate,
  useMTTranslateWithContext,
} from './use-machine-translation';
import { useTranslationMemorySearch, type TMMatch } from './use-translation-memory';

// Re-export for convenience
export type { UnifiedSuggestion } from '@/types';

/**
 * Suggestions state for a single key across all target languages.
 */
export interface KeySuggestionsState {
  suggestions: Map<string, UnifiedSuggestion[]>; // lang -> suggestions
  isLoading: Map<string, boolean>; // lang -> is loading
  mtFetched: Set<string>; // languages that have had MT fetched
}

interface UseSuggestionsOptions {
  projectId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  sourceText: string;
  enabled?: boolean;
}

/**
 * Hook that provides unified TM + MT suggestions for a translation key.
 *
 * - TM suggestions are fetched automatically when enabled
 * - MT suggestions are fetched on-demand via fetchMT()
 * - Results are unified into a single suggestions map by language
 */
export function useSuggestions({
  projectId,
  sourceLanguage,
  targetLanguages,
  sourceText,
  enabled = true,
}: UseSuggestionsOptions) {
  const [mtResults, setMtResults] = useState<Map<string, UnifiedSuggestion>>(new Map());
  const [fetchingMT, setFetchingMT] = useState<Set<string>>(new Set());

  // Check if MT is configured
  const { data: mtConfigsData } = useMTConfigs(projectId);
  const hasMT = useMemo(() => {
    const configs = mtConfigsData?.configs || [];
    return configs.some((c) => c.isActive);
  }, [mtConfigsData?.configs]);

  // MT translate mutation
  const mtTranslate = useMTTranslate(projectId);

  // TM search params (for future TM integration)
  // Currently unused but keeping structure for when TM API is implemented

  // Fetch TM for each target language
  const tmQueries = targetLanguages.map((lang) => {
    const params =
      enabled && sourceText && sourceText.length >= 3
        ? {
            sourceText,
            sourceLanguage,
            targetLanguage: lang,
            minSimilarity: 0.6,
            limit: 5,
          }
        : null;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTranslationMemorySearch(projectId, params, { enabled: enabled && !!params });
  });

  // Convert TM matches to unified suggestions
  const tmSuggestionsByLang = useMemo(() => {
    const result = new Map<string, UnifiedSuggestion[]>();

    targetLanguages.forEach((lang, index) => {
      const query = tmQueries[index];
      const matches = query?.data?.matches || [];

      const suggestions: UnifiedSuggestion[] = matches.map((match: TMMatch) => ({
        id: match.id,
        type: 'tm' as const,
        text: match.targetText,
        confidence: Math.round(match.similarity * 100),
        source: match.sourceText.substring(0, 30) + (match.sourceText.length > 30 ? '...' : ''),
      }));

      if (suggestions.length > 0) {
        result.set(lang, suggestions);
      }
    });

    return result;
  }, [targetLanguages, tmQueries]);

  // Merge TM and MT suggestions by language
  const allSuggestions = useMemo(() => {
    const result = new Map<string, UnifiedSuggestion[]>();

    targetLanguages.forEach((lang) => {
      const tmSuggestions = tmSuggestionsByLang.get(lang) || [];
      const mtSuggestion = mtResults.get(lang);

      const combined: UnifiedSuggestion[] = [];

      // Add TM suggestions first (sorted by confidence)
      combined.push(...tmSuggestions.sort((a, b) => b.confidence - a.confidence));

      // Add MT suggestion if available (at the end or interleaved based on confidence)
      if (mtSuggestion) {
        // Insert MT after high-confidence TM but before low-confidence
        const insertIndex = combined.findIndex((s) => s.confidence < 90);
        if (insertIndex === -1) {
          combined.push(mtSuggestion);
        } else {
          combined.splice(insertIndex, 0, mtSuggestion);
        }
      }

      if (combined.length > 0) {
        result.set(lang, combined);
      }
    });

    return result;
  }, [targetLanguages, tmSuggestionsByLang, mtResults]);

  // Fetch MT for a specific language
  const fetchMT = useCallback(
    async (targetLanguage: string) => {
      if (!sourceText || !hasMT) return;

      setFetchingMT((prev) => new Set(prev).add(targetLanguage));

      try {
        const result = await mtTranslate.mutateAsync({
          text: sourceText,
          sourceLanguage,
          targetLanguage,
        });

        const suggestion: UnifiedSuggestion = {
          id: `mt-${targetLanguage}-${Date.now()}`,
          type: 'mt',
          text: result.translatedText,
          confidence: 100, // MT is always "100% confident"
          provider: getProviderDisplayName(result.provider),
          cached: result.cached,
        };

        setMtResults((prev) => new Map(prev).set(targetLanguage, suggestion));
      } catch (error) {
        console.error('[useSuggestions] MT fetch failed:', error);
      } finally {
        setFetchingMT((prev) => {
          const next = new Set(prev);
          next.delete(targetLanguage);
          return next;
        });
      }
    },
    [sourceText, sourceLanguage, hasMT, mtTranslate]
  );

  // Fetch MT for all target languages
  const fetchMTAll = useCallback(async () => {
    if (!sourceText || !hasMT) return;

    // Fetch for all languages that don't already have MT
    const toFetch = targetLanguages.filter((lang) => !mtResults.has(lang));

    await Promise.all(toFetch.map((lang) => fetchMT(lang)));
  }, [sourceText, hasMT, targetLanguages, mtResults, fetchMT]);

  // Clear MT results (useful when source text changes)
  const clearMT = useCallback(() => {
    setMtResults(new Map());
  }, []);

  // Loading state per language
  const isLoading = useMemo(() => {
    const result = new Map<string, boolean>();

    targetLanguages.forEach((lang, index) => {
      const tmLoading = tmQueries[index]?.isLoading || false;
      const mtLoading = fetchingMT.has(lang);
      result.set(lang, tmLoading || mtLoading);
    });

    return result;
  }, [targetLanguages, tmQueries, fetchingMT]);

  return {
    /** Unified suggestions map: language -> suggestions array */
    suggestions: allSuggestions,
    /** Loading state per language */
    isLoading,
    /** Whether MT is configured and available */
    hasMT,
    /** Set of languages currently fetching MT */
    fetchingMT,
    /** Fetch MT for a specific language */
    fetchMT,
    /** Fetch MT for all target languages */
    fetchMTAll,
    /** Clear all MT results */
    clearMT,
  };
}

/**
 * Maximum number of keys to cache suggestions for (LRU eviction).
 * Moved to a module-level constant for maintainability.
 */
const MAX_SUGGESTIONS_CACHE_SIZE = 50;

/**
 * Simplified hook for managing suggestions state at the page level.
 * Provides a cache of suggestions per key ID with LRU eviction.
 * Supports TM, MT, and AI suggestions.
 *
 * @param projectId - Project ID
 * @param branchId - Optional branch ID for context-enhanced translation
 */

export function useKeySuggestions(projectId: string, branchId?: string) {
  // Use array to track key access order for LRU eviction (most recently accessed at end)
  const [, setCacheOrder] = useState<string[]>([]);
  const [suggestionsCache, setSuggestionsCache] = useState<
    Map<string, Map<string, UnifiedSuggestion[]>>
  >(new Map());
  const [fetchingMT, setFetchingMT] = useState<Map<string, Set<string>>>(new Map());
  const [fetchingAI, setFetchingAI] = useState<Map<string, Set<string>>>(new Map());

  // Helper to update cache order and evict if needed
  const touchCacheKey = useCallback((keyId: string) => {
    setCacheOrder((prev) => {
      // Remove key from current position and add to end
      const filtered = prev.filter((k) => k !== keyId);
      const newOrder = [...filtered, keyId];

      // If over limit, evict oldest keys
      if (newOrder.length > MAX_SUGGESTIONS_CACHE_SIZE) {
        const toEvict = newOrder.slice(0, newOrder.length - MAX_SUGGESTIONS_CACHE_SIZE);
        setSuggestionsCache((cache) => {
          const next = new Map(cache);
          toEvict.forEach((k) => next.delete(k));
          return next;
        });
        return newOrder.slice(newOrder.length - MAX_SUGGESTIONS_CACHE_SIZE);
      }
      return newOrder;
    });
  }, []);

  // MT configuration
  const mtTranslate = useMTTranslate(projectId);
  const mtTranslateWithContext = useMTTranslateWithContext(projectId);
  const { data: mtConfigsData } = useMTConfigs(projectId);
  const hasMT = useMemo(() => {
    const configs = mtConfigsData?.configs || [];
    return configs.some((c) => c.isActive);
  }, [mtConfigsData?.configs]);

  // AI configuration
  const aiTranslate = useAITranslate(projectId);
  const { data: aiConfigsData } = useAIConfigs(projectId);
  const hasAI = useMemo(() => {
    const configs = aiConfigsData?.configs || [];
    return configs.some((c) => c.isActive);
  }, [aiConfigsData?.configs]);

  // Get suggestions for a key (read-only, no state updates to avoid render loops)
  const getSuggestions = useCallback(
    (keyId: string): Map<string, UnifiedSuggestion[]> => {
      return suggestionsCache.get(keyId) || new Map();
    },
    [suggestionsCache]
  );

  // Set suggestions for a key/language (touches LRU)
  const setSuggestion = useCallback(
    (keyId: string, lang: string, suggestions: UnifiedSuggestion[]) => {
      touchCacheKey(keyId);
      setSuggestionsCache((prev) => {
        const next = new Map(prev);
        const keySuggestions = new Map(next.get(keyId) || new Map());
        keySuggestions.set(lang, suggestions);
        next.set(keyId, keySuggestions);
        return next;
      });
    },
    [touchCacheKey]
  );

  // Fetch MT for a specific key/language
  // Uses context-enhanced translation when branchId is provided
  const fetchMT = useCallback(
    async (keyId: string, sourceText: string, sourceLanguage: string, targetLanguage: string) => {
      if (!sourceText || !hasMT) return;

      // Mark as fetching
      setFetchingMT((prev) => {
        const next = new Map(prev);
        const keyFetching = new Set<string>(next.get(keyId) || new Set<string>());
        keyFetching.add(targetLanguage);
        next.set(keyId, keyFetching);
        return next;
      });

      try {
        // Use context-enhanced translation when branchId is available
        const result = branchId
          ? await mtTranslateWithContext.mutateAsync({
              branchId,
              keyId,
              text: sourceText,
              sourceLanguage,
              targetLanguage,
            })
          : await mtTranslate.mutateAsync({
              text: sourceText,
              sourceLanguage,
              targetLanguage,
            });

        // Build provider display with context info
        let providerDisplay = getProviderDisplayName(result.provider);
        const contextResult = result as {
          context?: { relatedTranslations: number; glossaryTerms: number };
        };
        if (contextResult.context) {
          const contextInfo: string[] = [];
          if (contextResult.context.relatedTranslations > 0) {
            contextInfo.push(`${contextResult.context.relatedTranslations} related`);
          }
          if (contextResult.context.glossaryTerms > 0) {
            contextInfo.push(`${contextResult.context.glossaryTerms} terms`);
          }
          if (contextInfo.length > 0) {
            providerDisplay += ` + ${contextInfo.join(', ')}`;
          }
        }

        const suggestion: UnifiedSuggestion = {
          id: `mt-${keyId}-${targetLanguage}-${Date.now()}`,
          type: 'mt',
          text: result.translatedText,
          confidence: 100,
          provider: providerDisplay,
          cached: result.cached,
        };

        // Add to cache (with LRU touch)
        touchCacheKey(keyId);
        setSuggestionsCache((prev) => {
          const next = new Map(prev);
          const keySuggestions = new Map(next.get(keyId) || new Map());
          const langSuggestions = keySuggestions.get(targetLanguage) || [];
          // Remove any existing MT suggestion for this language
          const filteredSuggestions = langSuggestions.filter(
            (s: UnifiedSuggestion) => s.type !== 'mt'
          );
          keySuggestions.set(targetLanguage, [...filteredSuggestions, suggestion]);
          next.set(keyId, keySuggestions);
          return next;
        });
      } catch (error) {
        console.error('[useKeySuggestions] MT fetch failed:', error);
      } finally {
        // Clear fetching state
        setFetchingMT((prev) => {
          const next = new Map(prev);
          const keyFetching = next.get(keyId);
          if (keyFetching) {
            keyFetching.delete(targetLanguage);
            if (keyFetching.size === 0) {
              next.delete(keyId);
            }
          }
          return next;
        });
      }
    },
    [hasMT, branchId, mtTranslate, mtTranslateWithContext, touchCacheKey]
  );

  // Check if MT is being fetched for a key/language
  const isFetchingMT = useCallback(
    (keyId: string, lang: string): boolean => {
      return fetchingMT.get(keyId)?.has(lang) || false;
    },
    [fetchingMT]
  );

  // Get all languages being fetched for a key
  const getFetchingMTSet = useCallback(
    (keyId: string): Set<string> => {
      return fetchingMT.get(keyId) || new Set();
    },
    [fetchingMT]
  );

  // Clear suggestions for a key (also removes from LRU order)
  const clearKeySuggestions = useCallback((keyId: string) => {
    setCacheOrder((prev) => prev.filter((k) => k !== keyId));
    setSuggestionsCache((prev) => {
      const next = new Map(prev);
      next.delete(keyId);
      return next;
    });
  }, []);

  // Fetch AI translation for a specific key/language
  const fetchAI = useCallback(
    async (keyId: string, sourceText: string, sourceLanguage: string, targetLanguage: string) => {
      if (!sourceText || !hasAI) return;

      // Mark as fetching
      setFetchingAI((prev) => {
        const next = new Map(prev);
        const keyFetching = new Set<string>(next.get(keyId) || new Set<string>());
        keyFetching.add(targetLanguage);
        next.set(keyId, keyFetching);
        return next;
      });

      try {
        const result = await aiTranslate.mutateAsync({
          text: sourceText,
          sourceLanguage,
          targetLanguage,
          keyId,
          branchId,
        });

        // Build provider display with model
        const providerDisplay = `${getAIProviderDisplayName(result.provider)} (${getModelDisplayName(result.model)})`;

        const suggestion: UnifiedSuggestion = {
          id: `ai-${keyId}-${targetLanguage}-${Date.now()}`,
          type: 'ai',
          text: result.text,
          confidence: 100,
          provider: providerDisplay,
          model: result.model,
          cached: result.cached,
          context: result.context,
        };

        // Add to cache (with LRU touch)
        touchCacheKey(keyId);
        setSuggestionsCache((prev) => {
          const next = new Map(prev);
          const keySuggestions = new Map(next.get(keyId) || new Map());
          const langSuggestions = keySuggestions.get(targetLanguage) || [];
          // Remove any existing AI suggestion for this language
          const filteredSuggestions = langSuggestions.filter(
            (s: UnifiedSuggestion) => s.type !== 'ai'
          );
          keySuggestions.set(targetLanguage, [...filteredSuggestions, suggestion]);
          next.set(keyId, keySuggestions);
          return next;
        });
      } catch (error) {
        console.error('[useKeySuggestions] AI fetch failed:', error);
      } finally {
        // Clear fetching state
        setFetchingAI((prev) => {
          const next = new Map(prev);
          const keyFetching = next.get(keyId);
          if (keyFetching) {
            keyFetching.delete(targetLanguage);
            if (keyFetching.size === 0) {
              next.delete(keyId);
            }
          }
          return next;
        });
      }
    },
    [hasAI, branchId, aiTranslate, touchCacheKey]
  );

  // Check if AI is being fetched for a key/language
  const isFetchingAI = useCallback(
    (keyId: string, lang: string): boolean => {
      return fetchingAI.get(keyId)?.has(lang) || false;
    },
    [fetchingAI]
  );

  // Get all languages being fetched via AI for a key
  const getFetchingAISet = useCallback(
    (keyId: string): Set<string> => {
      return fetchingAI.get(keyId) || new Set();
    },
    [fetchingAI]
  );

  return {
    getSuggestions,
    setSuggestion,
    fetchMT,
    fetchAI,
    isFetchingMT,
    isFetchingAI,
    getFetchingMTSet,
    getFetchingAISet,
    clearKeySuggestions,
    hasMT,
    hasAI,
  };
}
