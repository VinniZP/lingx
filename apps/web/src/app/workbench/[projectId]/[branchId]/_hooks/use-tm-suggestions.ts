'use client';

import type { UnifiedSuggestion } from '@/hooks/use-suggestions';
import { translationMemoryApi } from '@/lib/api';
import { useEffect, useRef } from 'react';

interface UseTMSuggestionsOptions {
  projectId: string;
  expandedKeyId: string | null;
  sourceText: string;
  sourceLanguage: string | undefined;
  targetLanguages: string[];
  setSuggestion: (keyId: string, lang: string, suggestions: UnifiedSuggestion[]) => void;
}

/**
 * Fetches Translation Memory suggestions when a key is expanded.
 * Tracks which keys have been fetched to avoid duplicate requests.
 */
export function useTMSuggestions({
  projectId,
  expandedKeyId,
  sourceText,
  sourceLanguage,
  targetLanguages,
  setSuggestion,
}: UseTMSuggestionsOptions) {
  // Track which keys we've already fetched TM for to avoid duplicate requests
  const fetchedTMKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!expandedKeyId || !sourceText || sourceText.length < 3 || !sourceLanguage) {
      return;
    }

    // Skip if we've already fetched for this key
    if (fetchedTMKeysRef.current.has(expandedKeyId)) {
      return;
    }
    fetchedTMKeysRef.current.add(expandedKeyId);

    // Fetch TM for all target languages
    const fetchTM = async () => {
      for (const targetLang of targetLanguages) {
        try {
          const result = await translationMemoryApi.search(projectId, {
            sourceText,
            sourceLanguage,
            targetLanguage: targetLang,
            minSimilarity: 0.6,
            limit: 5,
          });

          if (result.matches && result.matches.length > 0) {
            const suggestions: UnifiedSuggestion[] = result.matches.map((match) => ({
              id: match.id,
              type: 'tm' as const,
              text: match.targetText,
              confidence: Math.round(match.similarity * 100),
              source:
                match.sourceText.substring(0, 30) + (match.sourceText.length > 30 ? '...' : ''),
            }));
            setSuggestion(expandedKeyId, targetLang, suggestions);
          }
        } catch (error) {
          // Silent fail for TM search
          console.error('[TM] Search failed:', error);
        }
      }
    };

    fetchTM();
  }, [expandedKeyId, sourceText, sourceLanguage, targetLanguages, projectId, setSuggestion]);

  // Return function to clear cache if needed
  const clearCache = () => {
    fetchedTMKeysRef.current.clear();
  };

  return { clearCache };
}
