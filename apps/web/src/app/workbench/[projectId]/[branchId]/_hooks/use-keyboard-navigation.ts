'use client';

import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type FocusMode = 'keys' | 'source' | 'language' | 'suggestion';

interface UseKeyboardNavigationOptions {
  // Key list
  keys: TranslationKey[];
  selectedKeyId: string | null;
  onSelectKey: (keyId: string | null) => void;

  // Pagination
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  // Languages
  languages: ProjectLanguage[];
  defaultLanguage: ProjectLanguage | null;

  // Row expansion
  expandedLanguages: Set<string>;
  onExpandLanguage: (lang: string, expanded: boolean) => void;
  onCollapseAllLanguages: () => void;

  // Actions
  onApprove?: (translationId: string, status: 'APPROVED' | 'REJECTED') => void;
  getCurrentTranslationId?: (lang: string) => string | undefined;

  // Suggestions
  getSuggestionCount?: (lang: string) => number;
  onApplySuggestion?: (lang: string, index: number) => void;

  // AI/MT translation
  onFetchMT?: (lang: string) => void;
  onFetchAI?: (lang: string) => void;
  hasMT?: boolean;
  hasAI?: boolean;

  enabled?: boolean;
}

interface UseKeyboardNavigationReturn {
  // Focus state
  focusedKeyIndex: number | null;
  focusedLanguage: string | null;
  focusedSuggestionIndex: number | null;
  focusMode: FocusMode;

  // Focus handlers (for mouse clicks)
  handleSourceFocus: () => void;
  handleLanguageFocus: (lang: string) => void;

  // Refs
  keyListContainerRef: React.RefObject<HTMLDivElement | null>;
  sourceTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  languageTextareaRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement | null>>;

  // State setters for external control
  setFocusedKeyIndex: (index: number | null) => void;
  setFocusedLanguage: (lang: string | null) => void;
  setFocusedSuggestionIndex: (index: number | null) => void;
  setFocusMode: (mode: FocusMode) => void;

  // Imperative methods
  focusKey: (index: number) => void;
  focusLanguage: (lang: string) => void;
  focusSuggestion: (index: number) => void;
  focusSource: () => void;

  // State checks
  isKeyFocused: (index: number) => boolean;
  isLanguageFocused: (lang: string) => boolean;
  isSuggestionFocused: (index: number) => boolean;

  // Register refs
  registerLanguageTextarea: (lang: string, ref: HTMLTextAreaElement | null) => void;
}

/**
 * Hook for comprehensive keyboard navigation in the translation workbench.
 *
 * Supports:
 * - Ctrl/Cmd + Up/Down: Navigate between keys in sidebar
 * - Tab/Shift+Tab: Cycle through source and language fields
 * - Arrow Up/Down in textarea: Navigate suggestions
 * - Enter: Apply focused suggestion
 * - Escape: Progressive collapse (suggestions → rows → deselect key)
 * - Ctrl/Cmd + Enter: Approve current translation
 * - Ctrl/Cmd + Backspace: Reject current translation
 * - Ctrl/Cmd + M: Machine translate
 * - Ctrl/Cmd + I: AI translate
 */
export function useKeyboardNavigation({
  keys,
  selectedKeyId,
  onSelectKey,
  page,
  totalPages,
  onPageChange,
  languages,
  defaultLanguage,
  expandedLanguages,
  onExpandLanguage,
  onCollapseAllLanguages,
  onApprove,
  getCurrentTranslationId,
  getSuggestionCount,
  onApplySuggestion,
  onFetchMT,
  onFetchAI,
  hasMT = false,
  hasAI = false,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  // Focus state
  // Derive focusedKeyIndex from selectedKeyId to avoid cascading renders
  const focusedKeyIndex = useMemo(() => {
    if (!selectedKeyId) return null;
    const index = keys.findIndex((k) => k.id === selectedKeyId);
    return index === -1 ? null : index;
  }, [selectedKeyId, keys]);

  const [focusedLanguage, setFocusedLanguage] = useState<string | null>(null);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>('keys');

  // Refs for DOM access
  const keyListContainerRef = useRef<HTMLDivElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const languageTextareaRefs = useRef<Map<string, HTMLTextAreaElement | null>>(new Map());

  // Ref for stable event handler (avoids re-registering on every state change)
  const handlersRef = useRef<{
    focusMode: FocusMode;
    focusedLanguage: string | null;
    handleEscape: () => void;
    handleApprove: () => void;
    handleReject: () => void;
    handleFetchMTShortcut: () => void;
    handleFetchAIShortcut: () => void;
    handleEnter: () => void;
    navigateKey: (direction: 'up' | 'down') => void;
    navigateTab: (direction: 'forward' | 'backward') => void;
    navigateSuggestion: (direction: 'up' | 'down') => void;
    getSuggestionCount: ((lang: string) => number) | undefined;
  } | null>(null);

  // Pending navigation state for page transitions
  const pendingNavigation = useRef<'first' | 'last' | null>(null);

  // Get target languages (non-default)
  const targetLanguages = useMemo(() => {
    return languages.filter((l) => !l.isDefault);
  }, [languages]);

  // Get ordered language codes for Tab navigation (source first, then targets)
  const orderedLanguageCodes = useMemo(() => {
    const codes: string[] = [];
    if (defaultLanguage) {
      codes.push(defaultLanguage.code);
    }
    targetLanguages.forEach((l) => codes.push(l.code));
    return codes;
  }, [defaultLanguage, targetLanguages]);

  // Register language textarea ref
  const registerLanguageTextarea = useCallback((lang: string, ref: HTMLTextAreaElement | null) => {
    if (ref) {
      languageTextareaRefs.current.set(lang, ref);
    } else {
      languageTextareaRefs.current.delete(lang);
    }
  }, []);

  // Handle pending navigation after page change
  useEffect(() => {
    if (pendingNavigation.current && keys.length > 0) {
      const targetIndex = pendingNavigation.current === 'first' ? 0 : keys.length - 1;
      pendingNavigation.current = null;

      // Select the key - focusedKeyIndex is derived from selectedKeyId
      const keyId = keys[targetIndex]?.id;
      if (keyId) {
        onSelectKey(keyId);
      }

      // Scroll into view after a small delay
      requestAnimationFrame(() => {
        const element = keyListContainerRef.current?.querySelector(
          `[data-key-index="${targetIndex}"]`
        );
        element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }, [keys, onSelectKey]);

  // Focus a key by index with scroll
  const focusKey = useCallback(
    (index: number) => {
      if (index < 0 || index >= keys.length) return;

      // Select the key - focusedKeyIndex is derived from selectedKeyId
      const keyId = keys[index]?.id;
      if (keyId) {
        onSelectKey(keyId);
      }

      // Scroll key into view
      requestAnimationFrame(() => {
        const element = keyListContainerRef.current?.querySelector(`[data-key-index="${index}"]`);
        element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });

      // Focus source field after key selection
      if (defaultLanguage) {
        setFocusMode('source');
        setFocusedLanguage(null);
        setFocusedSuggestionIndex(null);

        // Small delay to let the UI update first
        setTimeout(() => {
          sourceTextareaRef.current?.focus();
        }, 50);
      }
    },
    [keys, onSelectKey, defaultLanguage]
  );

  // Focus source field
  const focusSource = useCallback(() => {
    setFocusMode('source');
    setFocusedLanguage(null);
    setFocusedSuggestionIndex(null);

    requestAnimationFrame(() => {
      sourceTextareaRef.current?.focus();
    });
  }, []);

  // Focus a language field
  const focusLanguage = useCallback(
    (lang: string) => {
      setFocusMode('language');
      setFocusedLanguage(lang);
      setFocusedSuggestionIndex(null);

      // Auto-expand if collapsed
      if (!expandedLanguages.has(lang) && lang !== defaultLanguage?.code) {
        onExpandLanguage(lang, true);
      }

      requestAnimationFrame(() => {
        const textarea = languageTextareaRefs.current.get(lang);
        textarea?.focus();
      });
    },
    [expandedLanguages, onExpandLanguage, defaultLanguage]
  );

  // Focus a suggestion
  const focusSuggestion = useCallback((index: number) => {
    setFocusMode('suggestion');
    setFocusedSuggestionIndex(index);
  }, []);

  // Handle source focus (from mouse click)
  const handleSourceFocus = useCallback(() => {
    setFocusMode('source');
    setFocusedLanguage(null);
    setFocusedSuggestionIndex(null);
  }, []);

  // Handle language focus (from mouse click)
  const handleLanguageFocus = useCallback((lang: string) => {
    setFocusMode('language');
    setFocusedLanguage(lang);
    setFocusedSuggestionIndex(null);
  }, []);

  // Check functions
  const isKeyFocused = useCallback((index: number) => focusedKeyIndex === index, [focusedKeyIndex]);

  const isLanguageFocused = useCallback(
    (lang: string) =>
      focusedLanguage === lang && (focusMode === 'language' || focusMode === 'suggestion'),
    [focusedLanguage, focusMode]
  );

  const isSuggestionFocused = useCallback(
    (index: number) => focusedSuggestionIndex === index && focusMode === 'suggestion',
    [focusedSuggestionIndex, focusMode]
  );

  // Navigate to next/previous key
  const navigateKey = useCallback(
    (direction: 'up' | 'down') => {
      const currentIndex = focusedKeyIndex ?? -1;

      if (direction === 'up') {
        if (currentIndex > 0) {
          focusKey(currentIndex - 1);
        } else if (page > 1) {
          // Go to previous page, focus last key
          pendingNavigation.current = 'last';
          onPageChange(page - 1);
        }
      } else {
        if (currentIndex < keys.length - 1) {
          focusKey(currentIndex + 1);
        } else if (page < totalPages) {
          // Go to next page, focus first key
          pendingNavigation.current = 'first';
          onPageChange(page + 1);
        }
      }
    },
    [focusedKeyIndex, focusKey, keys.length, page, totalPages, onPageChange]
  );

  // Navigate Tab through fields
  const navigateTab = useCallback(
    (direction: 'forward' | 'backward') => {
      if (!selectedKeyId) return;

      const currentLangIndex = focusedLanguage
        ? orderedLanguageCodes.indexOf(focusedLanguage)
        : focusMode === 'source'
          ? 0
          : -1;

      if (direction === 'forward') {
        // Currently on source or a language
        const nextIndex = currentLangIndex + 1;
        if (nextIndex < orderedLanguageCodes.length) {
          const nextLang = orderedLanguageCodes[nextIndex];
          if (nextLang === defaultLanguage?.code) {
            focusSource();
          } else {
            focusLanguage(nextLang);
          }
        } else {
          // Wrap to source
          focusSource();
        }
      } else {
        // Backward
        const prevIndex = currentLangIndex - 1;
        if (prevIndex >= 0) {
          const prevLang = orderedLanguageCodes[prevIndex];
          if (prevLang === defaultLanguage?.code) {
            focusSource();
          } else {
            focusLanguage(prevLang);
          }
        } else {
          // Wrap to last language
          const lastLang = orderedLanguageCodes[orderedLanguageCodes.length - 1];
          if (lastLang === defaultLanguage?.code) {
            focusSource();
          } else {
            focusLanguage(lastLang);
          }
        }
      }
    },
    [
      selectedKeyId,
      focusedLanguage,
      focusMode,
      orderedLanguageCodes,
      defaultLanguage,
      focusSource,
      focusLanguage,
    ]
  );

  // Navigate suggestions
  const navigateSuggestion = useCallback(
    (direction: 'up' | 'down') => {
      if (!focusedLanguage) return;

      const count = getSuggestionCount?.(focusedLanguage) ?? 0;
      if (count === 0) return;

      const currentIndex = focusedSuggestionIndex ?? -1;

      if (direction === 'down') {
        if (focusMode !== 'suggestion') {
          // Enter suggestion mode
          focusSuggestion(0);
        } else if (currentIndex < count - 1) {
          focusSuggestion(currentIndex + 1);
        }
      } else {
        if (currentIndex > 0) {
          focusSuggestion(currentIndex - 1);
        } else {
          // Exit suggestion mode, return to textarea
          setFocusMode('language');
          setFocusedSuggestionIndex(null);
          const textarea = languageTextareaRefs.current.get(focusedLanguage);
          textarea?.focus();
        }
      }
    },
    [focusedLanguage, focusedSuggestionIndex, focusMode, getSuggestionCount, focusSuggestion]
  );

  // Handle Escape key (progressive)
  const handleEscape = useCallback(() => {
    if (focusMode === 'suggestion') {
      // Exit suggestion mode
      setFocusMode('language');
      setFocusedSuggestionIndex(null);
      if (focusedLanguage) {
        const textarea = languageTextareaRefs.current.get(focusedLanguage);
        textarea?.focus();
      }
    } else if (expandedLanguages.size > 0) {
      // Collapse all expanded rows
      onCollapseAllLanguages();
      setFocusMode('keys');
      setFocusedLanguage(null);
    } else if (selectedKeyId) {
      // Deselect key - focusedKeyIndex is derived from selectedKeyId
      onSelectKey(null);
      setFocusMode('keys');
    }
  }, [
    focusMode,
    expandedLanguages.size,
    selectedKeyId,
    focusedLanguage,
    onCollapseAllLanguages,
    onSelectKey,
  ]);

  // Handle approve (Ctrl+Enter)
  const handleApprove = useCallback(() => {
    if (!focusedLanguage || !getCurrentTranslationId || !onApprove) return;

    const translationId = getCurrentTranslationId(focusedLanguage);
    if (translationId) {
      onApprove(translationId, 'APPROVED');
    }
  }, [focusedLanguage, getCurrentTranslationId, onApprove]);

  // Handle reject (Ctrl+Backspace)
  const handleReject = useCallback(() => {
    if (!focusedLanguage || !getCurrentTranslationId || !onApprove) return;

    const translationId = getCurrentTranslationId(focusedLanguage);
    if (translationId) {
      onApprove(translationId, 'REJECTED');
    }
  }, [focusedLanguage, getCurrentTranslationId, onApprove]);

  // Handle Ctrl+M (machine translation)
  const handleFetchMTShortcut = useCallback(() => {
    if (!focusedLanguage || !onFetchMT || !hasMT) return;
    onFetchMT(focusedLanguage);
  }, [focusedLanguage, onFetchMT, hasMT]);

  // Handle Ctrl+I (AI translation)
  const handleFetchAIShortcut = useCallback(() => {
    if (!focusedLanguage || !onFetchAI || !hasAI) return;
    onFetchAI(focusedLanguage);
  }, [focusedLanguage, onFetchAI, hasAI]);

  // Handle Enter (expand key or apply suggestion)
  const handleEnter = useCallback(() => {
    if (focusMode === 'suggestion' && focusedSuggestionIndex !== null && focusedLanguage) {
      // Apply suggestion
      onApplySuggestion?.(focusedLanguage, focusedSuggestionIndex);
      // Return to language mode
      setFocusMode('language');
      setFocusedSuggestionIndex(null);
    } else if (focusMode === 'keys' && focusedKeyIndex !== null) {
      // If key is selected but no language focused, focus first expandable language
      const firstTargetLang = targetLanguages[0]?.code;
      if (firstTargetLang) {
        focusLanguage(firstTargetLang);
      }
    }
  }, [
    focusMode,
    focusedSuggestionIndex,
    focusedLanguage,
    focusedKeyIndex,
    targetLanguages,
    focusLanguage,
    onApplySuggestion,
  ]);

  // Keep handlers ref in sync (runs synchronously before effects)
  useLayoutEffect(() => {
    handlersRef.current = {
      focusMode,
      focusedLanguage,
      handleEscape,
      handleApprove,
      handleReject,
      handleFetchMTShortcut,
      handleFetchAIShortcut,
      handleEnter,
      navigateKey,
      navigateTab,
      navigateSuggestion,
      getSuggestionCount,
    };
  });

  // Global keyboard event handler (stable - only re-registers when enabled changes)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const handlers = handlersRef.current;
      if (!handlers) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isMod = e.metaKey || e.ctrlKey;

      // === Global shortcuts (work everywhere) ===

      // Escape - progressive collapse
      if (e.key === 'Escape') {
        e.preventDefault();
        handlers.handleEscape();
        return;
      }

      // Ctrl/Cmd + Up/Down - key navigation (works even in inputs)
      if (isMod && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        handlers.navigateKey(e.key === 'ArrowUp' ? 'up' : 'down');
        return;
      }

      // Ctrl/Cmd + Enter - approve (only in language field context)
      if (isMod && e.key === 'Enter' && handlers.focusMode === 'language' && !e.shiftKey) {
        e.preventDefault();
        handlers.handleApprove();
        return;
      }

      // Ctrl/Cmd + Backspace - reject (only in language field context)
      if (isMod && e.key === 'Backspace' && handlers.focusMode === 'language' && !e.shiftKey) {
        e.preventDefault();
        handlers.handleReject();
        return;
      }

      // Ctrl/Cmd + M - machine translation (only in language field context)
      if (isMod && e.key === 'm' && handlers.focusMode === 'language' && !e.shiftKey) {
        e.preventDefault();
        handlers.handleFetchMTShortcut();
        return;
      }

      // Ctrl/Cmd + I - AI translation (only in language field context)
      if (isMod && e.key === 'i' && handlers.focusMode === 'language' && !e.shiftKey) {
        e.preventDefault();
        handlers.handleFetchAIShortcut();
        return;
      }

      // === Input-specific shortcuts ===
      if (isInput) {
        // Tab navigation (only when in our textareas)
        if (
          e.key === 'Tab' &&
          (handlers.focusMode === 'source' || handlers.focusMode === 'language')
        ) {
          e.preventDefault();
          handlers.navigateTab(e.shiftKey ? 'backward' : 'forward');
          return;
        }

        // Arrow down in textarea - enter suggestion mode
        if (e.key === 'ArrowDown' && handlers.focusMode === 'language' && !e.shiftKey && !isMod) {
          const suggestionCount = handlers.focusedLanguage
            ? (handlers.getSuggestionCount?.(handlers.focusedLanguage) ?? 0)
            : 0;
          if (suggestionCount > 0) {
            // Only if at end of textarea
            const textarea = target as HTMLTextAreaElement;
            if (textarea.selectionStart === textarea.value.length) {
              e.preventDefault();
              handlers.navigateSuggestion('down');
              return;
            }
          }
        }
      }

      // === Suggestion mode shortcuts ===
      if (handlers.focusMode === 'suggestion') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handlers.navigateSuggestion('down');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handlers.navigateSuggestion('up');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          handlers.handleEnter();
          return;
        }
      }

      // === Non-input shortcuts ===
      if (!isInput) {
        // Enter to expand first language when key is focused
        if (e.key === 'Enter' && handlers.focusMode === 'keys') {
          e.preventDefault();
          handlers.handleEnter();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  // No-op setter for focusedKeyIndex (derived state, use onSelectKey instead)
  const setFocusedKeyIndex = useCallback(() => {
    // focusedKeyIndex is derived from selectedKeyId - use onSelectKey to change it
  }, []);

  return {
    // Focus state
    focusedKeyIndex,
    focusedLanguage,
    focusedSuggestionIndex,
    focusMode,

    // Focus handlers (for mouse clicks)
    handleSourceFocus,
    handleLanguageFocus,

    // Refs
    keyListContainerRef,
    sourceTextareaRef,
    languageTextareaRefs,

    // State setters
    setFocusedKeyIndex,
    setFocusedLanguage,
    setFocusedSuggestionIndex,
    setFocusMode,

    // Imperative methods
    focusKey,
    focusLanguage,
    focusSuggestion,
    focusSource,

    // State checks
    isKeyFocused,
    isLanguageFocused,
    isSuggestionFocused,

    // Register refs
    registerLanguageTextarea,
  };
}
