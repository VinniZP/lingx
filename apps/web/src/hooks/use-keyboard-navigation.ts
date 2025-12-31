'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  keyCount: number;
  languageCount: number;
  expandedKeyId: string | null;
  onExpandKey: (keyId: string | null) => void;
  getKeyIdByIndex: (index: number) => string | undefined;
  enabled?: boolean;
}

interface KeyboardNavigationState {
  focusedKeyIndex: number | null;
  focusedLanguage: string | null;
}

/**
 * Hook for managing keyboard navigation in the translation editor.
 *
 * Supports:
 * - Arrow Up/Down to move between keys
 * - Tab/Shift+Tab to move between language fields within a key
 * - Enter to expand/confirm
 * - Escape to collapse/cancel
 */
export function useKeyboardNavigation({
  keyCount,
  languageCount,
  expandedKeyId,
  onExpandKey,
  getKeyIdByIndex,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [focusedKeyIndex, setFocusedKeyIndex] = useState<number | null>(null);
  const [focusedLanguage, setFocusedLanguage] = useState<string | null>(null);

  // Navigate to a specific key
  const navigateToKey = useCallback((index: number) => {
    if (index < 0 || index >= keyCount) return;
    setFocusedKeyIndex(index);
    const keyId = getKeyIdByIndex(index);
    if (keyId) {
      onExpandKey(keyId);
    }
  }, [keyCount, getKeyIdByIndex, onExpandKey]);

  // Handle keyboard navigation commands from child components
  const handleKeyboardNavigate = useCallback((direction: 'up' | 'down' | 'next' | 'prev') => {
    if (focusedKeyIndex === null) return;

    switch (direction) {
      case 'up':
        // Move to previous key
        if (focusedKeyIndex > 0) {
          navigateToKey(focusedKeyIndex - 1);
        }
        break;
      case 'down':
        // Move to next key
        if (focusedKeyIndex < keyCount - 1) {
          navigateToKey(focusedKeyIndex + 1);
        }
        break;
      case 'next':
        // Move to next key and focus first language
        if (focusedKeyIndex < keyCount - 1) {
          navigateToKey(focusedKeyIndex + 1);
        }
        break;
      case 'prev':
        // Move to previous key and focus last language
        if (focusedKeyIndex > 0) {
          navigateToKey(focusedKeyIndex - 1);
        }
        break;
    }
  }, [focusedKeyIndex, keyCount, navigateToKey]);

  // Focus a specific language within the expanded key
  const focusLanguage = useCallback((lang: string | null) => {
    setFocusedLanguage(lang);
  }, []);

  // Handle page-level keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input (unless it's a navigation key)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Global shortcuts (work even in inputs)
      if (e.key === 'Escape') {
        if (expandedKeyId) {
          e.preventDefault();
          onExpandKey(null);
          return;
        }
      }

      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Command palette will be handled separately
        return;
      }

      // Navigation shortcuts (only when not in input)
      if (!isInput) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            if (focusedKeyIndex === null) {
              setFocusedKeyIndex(0);
            } else if (focusedKeyIndex > 0) {
              setFocusedKeyIndex(focusedKeyIndex - 1);
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (focusedKeyIndex === null) {
              setFocusedKeyIndex(0);
            } else if (focusedKeyIndex < keyCount - 1) {
              setFocusedKeyIndex(focusedKeyIndex + 1);
            }
            break;
          case 'Enter':
            if (focusedKeyIndex !== null && !expandedKeyId) {
              e.preventDefault();
              const keyId = getKeyIdByIndex(focusedKeyIndex);
              if (keyId) {
                onExpandKey(keyId);
              }
            }
            break;
          case 'j':
            // Vim-style navigation
            if (focusedKeyIndex === null) {
              setFocusedKeyIndex(0);
            } else if (focusedKeyIndex < keyCount - 1) {
              setFocusedKeyIndex(focusedKeyIndex + 1);
            }
            break;
          case 'k':
            // Vim-style navigation
            if (focusedKeyIndex === null) {
              setFocusedKeyIndex(keyCount - 1);
            } else if (focusedKeyIndex > 0) {
              setFocusedKeyIndex(focusedKeyIndex - 1);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    expandedKeyId,
    focusedKeyIndex,
    keyCount,
    onExpandKey,
    getKeyIdByIndex,
  ]);

  // Update focused key index when expanded key changes
  useEffect(() => {
    if (expandedKeyId) {
      // Find the index of the expanded key
      for (let i = 0; i < keyCount; i++) {
        if (getKeyIdByIndex(i) === expandedKeyId) {
          setFocusedKeyIndex(i);
          break;
        }
      }
    }
  }, [expandedKeyId, keyCount, getKeyIdByIndex]);

  // Check if a key index is focused
  const isKeyFocused = useCallback((index: number) => {
    return focusedKeyIndex === index;
  }, [focusedKeyIndex]);

  // Check if a key ID is focused
  const isKeyIdFocused = useCallback((keyId: string) => {
    if (focusedKeyIndex === null) return false;
    return getKeyIdByIndex(focusedKeyIndex) === keyId;
  }, [focusedKeyIndex, getKeyIdByIndex]);

  return {
    /** Index of the currently focused key */
    focusedKeyIndex,
    /** Currently focused language code */
    focusedLanguage,
    /** Set the focused key index directly */
    setFocusedKeyIndex,
    /** Set the focused language */
    focusLanguage,
    /** Navigate to a key by index */
    navigateToKey,
    /** Handle navigation commands from child components */
    handleKeyboardNavigate,
    /** Check if a key index is focused */
    isKeyFocused,
    /** Check if a key ID is focused */
    isKeyIdFocused,
  };
}
