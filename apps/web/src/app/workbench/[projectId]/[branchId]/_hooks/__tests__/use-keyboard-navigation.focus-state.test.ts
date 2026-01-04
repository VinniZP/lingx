import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

/**
 * Unit tests for useKeyboardNavigation hook - Focus State Management
 *
 * Tests the focus state derivation, state transitions, and focus mode handling.
 */

// Mock translation keys
const createMockKey = (id: string, name: string): TranslationKey => ({
  id,
  name,
  namespace: null,
  description: null,
  branchId: 'branch-1',
  translations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Mock languages
const createMockLanguage = (code: string, name: string, isDefault: boolean): ProjectLanguage => ({
  id: `lang-${code}`,
  code,
  name,
  isDefault,
});

// Default hook options factory
const createDefaultOptions = (
  overrides: Partial<Parameters<typeof useKeyboardNavigation>[0]> = {}
) => ({
  keys: [
    createMockKey('key-1', 'common.hello'),
    createMockKey('key-2', 'common.world'),
    createMockKey('key-3', 'common.goodbye'),
  ],
  selectedKeyId: null,
  onSelectKey: vi.fn(),
  page: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
  languages: [
    createMockLanguage('en', 'English', true),
    createMockLanguage('de', 'German', false),
    createMockLanguage('fr', 'French', false),
  ],
  defaultLanguage: createMockLanguage('en', 'English', true),
  expandedLanguages: new Set<string>(),
  onExpandLanguage: vi.fn(),
  onCollapseAllLanguages: vi.fn(),
  enabled: true,
  ...overrides,
});

describe('useKeyboardNavigation - Focus State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('focusedKeyIndex derivation from selectedKeyId', () => {
    it('should return null when selectedKeyId is null', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultOptions({ selectedKeyId: null }))
      );

      expect(result.current.focusedKeyIndex).toBeNull();
    });

    it('should return correct index when selectedKeyId matches a key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultOptions({ selectedKeyId: 'key-2' }))
      );

      expect(result.current.focusedKeyIndex).toBe(1);
    });

    it('should return index 0 for first key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultOptions({ selectedKeyId: 'key-1' }))
      );

      expect(result.current.focusedKeyIndex).toBe(0);
    });

    it('should return last index for last key', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultOptions({ selectedKeyId: 'key-3' }))
      );

      expect(result.current.focusedKeyIndex).toBe(2);
    });

    it('should return null when selectedKeyId does not exist in keys array', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultOptions({ selectedKeyId: 'non-existent-key' }))
      );

      expect(result.current.focusedKeyIndex).toBeNull();
    });

    it('should update focusedKeyIndex when selectedKeyId changes', () => {
      const options = createDefaultOptions({ selectedKeyId: 'key-1' });
      const { result, rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: options,
      });

      expect(result.current.focusedKeyIndex).toBe(0);

      rerender({ ...options, selectedKeyId: 'key-3' });

      expect(result.current.focusedKeyIndex).toBe(2);
    });

    it('should update focusedKeyIndex when keys array changes', () => {
      const initialKeys = [
        createMockKey('key-1', 'common.hello'),
        createMockKey('key-2', 'common.world'),
      ];
      const options = createDefaultOptions({ keys: initialKeys, selectedKeyId: 'key-2' });
      const { result, rerender } = renderHook((props) => useKeyboardNavigation(props), {
        initialProps: options,
      });

      expect(result.current.focusedKeyIndex).toBe(1);

      // Add a key at the beginning - now key-2 is at index 2
      const newKeys = [
        createMockKey('key-0', 'common.new'),
        createMockKey('key-1', 'common.hello'),
        createMockKey('key-2', 'common.world'),
      ];
      rerender({ ...options, keys: newKeys });

      expect(result.current.focusedKeyIndex).toBe(2);
    });

    it('should return null with empty keys array', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(createDefaultOptions({ keys: [], selectedKeyId: 'key-1' }))
      );

      expect(result.current.focusedKeyIndex).toBeNull();
    });
  });

  describe('focusedLanguage state', () => {
    it('should initialize focusedLanguage as null', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      expect(result.current.focusedLanguage).toBeNull();
    });

    it('should update focusedLanguage via setFocusedLanguage', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusedLanguage('de');
      });

      expect(result.current.focusedLanguage).toBe('de');
    });

    it('should allow setting focusedLanguage to null', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusedLanguage('de');
      });
      expect(result.current.focusedLanguage).toBe('de');

      act(() => {
        result.current.setFocusedLanguage(null);
      });
      expect(result.current.focusedLanguage).toBeNull();
    });

    it('should update focusedLanguage when handleLanguageFocus is called', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.handleLanguageFocus('fr');
      });

      expect(result.current.focusedLanguage).toBe('fr');
    });
  });

  describe('focusedSuggestionIndex state', () => {
    it('should initialize focusedSuggestionIndex as null', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('should update focusedSuggestionIndex via setFocusedSuggestionIndex', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusedSuggestionIndex(2);
      });

      expect(result.current.focusedSuggestionIndex).toBe(2);
    });

    it('should allow setting focusedSuggestionIndex to null', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusedSuggestionIndex(1);
      });
      expect(result.current.focusedSuggestionIndex).toBe(1);

      act(() => {
        result.current.setFocusedSuggestionIndex(null);
      });
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('should allow setting focusedSuggestionIndex to 0', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusedSuggestionIndex(0);
      });

      expect(result.current.focusedSuggestionIndex).toBe(0);
    });
  });

  describe('focusMode state transitions', () => {
    it('should initialize focusMode as "keys"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      expect(result.current.focusMode).toBe('keys');
    });

    it('should update focusMode via setFocusMode', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusMode('language');
      });

      expect(result.current.focusMode).toBe('language');
    });

    it('should transition from "keys" to "source"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      expect(result.current.focusMode).toBe('keys');

      act(() => {
        result.current.setFocusMode('source');
      });

      expect(result.current.focusMode).toBe('source');
    });

    it('should transition from "source" to "language"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusMode('source');
      });
      expect(result.current.focusMode).toBe('source');

      act(() => {
        result.current.setFocusMode('language');
      });
      expect(result.current.focusMode).toBe('language');
    });

    it('should transition from "language" to "suggestion"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusMode('language');
      });
      expect(result.current.focusMode).toBe('language');

      act(() => {
        result.current.setFocusMode('suggestion');
      });
      expect(result.current.focusMode).toBe('suggestion');
    });

    it('should transition from "suggestion" back to "keys"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.setFocusMode('suggestion');
      });
      expect(result.current.focusMode).toBe('suggestion');

      act(() => {
        result.current.setFocusMode('keys');
      });
      expect(result.current.focusMode).toBe('keys');
    });

    it('should allow direct transition between any modes', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // Direct transition from keys to suggestion
      act(() => {
        result.current.setFocusMode('suggestion');
      });
      expect(result.current.focusMode).toBe('suggestion');

      // Direct transition from suggestion to source
      act(() => {
        result.current.setFocusMode('source');
      });
      expect(result.current.focusMode).toBe('source');
    });
  });

  describe('handleSourceFocus', () => {
    it('should set focusMode to "source"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.handleSourceFocus();
      });

      expect(result.current.focusMode).toBe('source');
    });

    it('should clear focusedLanguage', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // First set a language
      act(() => {
        result.current.setFocusedLanguage('de');
      });
      expect(result.current.focusedLanguage).toBe('de');

      // Then handle source focus
      act(() => {
        result.current.handleSourceFocus();
      });

      expect(result.current.focusedLanguage).toBeNull();
    });

    it('should clear focusedSuggestionIndex', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // First set a suggestion index
      act(() => {
        result.current.setFocusedSuggestionIndex(2);
      });
      expect(result.current.focusedSuggestionIndex).toBe(2);

      // Then handle source focus
      act(() => {
        result.current.handleSourceFocus();
      });

      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('should clear both focusedLanguage and focusedSuggestionIndex together', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // Set both states
      act(() => {
        result.current.setFocusedLanguage('fr');
        result.current.setFocusedSuggestionIndex(1);
      });

      expect(result.current.focusedLanguage).toBe('fr');
      expect(result.current.focusedSuggestionIndex).toBe(1);

      // Handle source focus
      act(() => {
        result.current.handleSourceFocus();
      });

      expect(result.current.focusMode).toBe('source');
      expect(result.current.focusedLanguage).toBeNull();
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('should work correctly from "suggestion" mode', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // Setup suggestion mode
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(0);
      });

      expect(result.current.focusMode).toBe('suggestion');

      // Handle source focus
      act(() => {
        result.current.handleSourceFocus();
      });

      expect(result.current.focusMode).toBe('source');
      expect(result.current.focusedLanguage).toBeNull();
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });
  });

  describe('handleLanguageFocus', () => {
    it('should set focusMode to "language"', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.handleLanguageFocus('de');
      });

      expect(result.current.focusMode).toBe('language');
    });

    it('should set focusedLanguage to the provided language', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.handleLanguageFocus('de');
      });

      expect(result.current.focusedLanguage).toBe('de');
    });

    it('should clear focusedSuggestionIndex', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // First set a suggestion index
      act(() => {
        result.current.setFocusedSuggestionIndex(3);
      });
      expect(result.current.focusedSuggestionIndex).toBe(3);

      // Then handle language focus
      act(() => {
        result.current.handleLanguageFocus('fr');
      });

      expect(result.current.focusedSuggestionIndex).toBeNull();
    });

    it('should update focusedLanguage when called with different language', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      act(() => {
        result.current.handleLanguageFocus('de');
      });
      expect(result.current.focusedLanguage).toBe('de');

      act(() => {
        result.current.handleLanguageFocus('fr');
      });
      expect(result.current.focusedLanguage).toBe('fr');
    });

    it('should work correctly from "source" mode', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // Setup source mode
      act(() => {
        result.current.handleSourceFocus();
      });
      expect(result.current.focusMode).toBe('source');

      // Handle language focus
      act(() => {
        result.current.handleLanguageFocus('de');
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('de');
    });

    it('should work correctly from "suggestion" mode', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      // Setup suggestion mode
      act(() => {
        result.current.setFocusMode('suggestion');
        result.current.setFocusedLanguage('de');
        result.current.setFocusedSuggestionIndex(0);
      });

      // Handle language focus with different language
      act(() => {
        result.current.handleLanguageFocus('fr');
      });

      expect(result.current.focusMode).toBe('language');
      expect(result.current.focusedLanguage).toBe('fr');
      expect(result.current.focusedSuggestionIndex).toBeNull();
    });
  });

  describe('state check functions', () => {
    describe('isKeyFocused', () => {
      it('should return true when index matches focusedKeyIndex', () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(createDefaultOptions({ selectedKeyId: 'key-2' }))
        );

        expect(result.current.isKeyFocused(1)).toBe(true);
      });

      it('should return false when index does not match focusedKeyIndex', () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(createDefaultOptions({ selectedKeyId: 'key-2' }))
        );

        expect(result.current.isKeyFocused(0)).toBe(false);
        expect(result.current.isKeyFocused(2)).toBe(false);
      });

      it('should return false when no key is focused', () => {
        const { result } = renderHook(() =>
          useKeyboardNavigation(createDefaultOptions({ selectedKeyId: null }))
        );

        expect(result.current.isKeyFocused(0)).toBe(false);
        expect(result.current.isKeyFocused(1)).toBe(false);
      });
    });

    describe('isLanguageFocused', () => {
      it('should return true when language matches and focusMode is "language"', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.handleLanguageFocus('de');
        });

        expect(result.current.isLanguageFocused('de')).toBe(true);
      });

      it('should return true when language matches and focusMode is "suggestion"', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusedLanguage('de');
          result.current.setFocusMode('suggestion');
        });

        expect(result.current.isLanguageFocused('de')).toBe(true);
      });

      it('should return false when language does not match', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.handleLanguageFocus('de');
        });

        expect(result.current.isLanguageFocused('fr')).toBe(false);
      });

      it('should return false when focusMode is "keys"', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusedLanguage('de');
          result.current.setFocusMode('keys');
        });

        expect(result.current.isLanguageFocused('de')).toBe(false);
      });

      it('should return false when focusMode is "source"', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusedLanguage('de');
          result.current.setFocusMode('source');
        });

        expect(result.current.isLanguageFocused('de')).toBe(false);
      });
    });

    describe('isSuggestionFocused', () => {
      it('should return true when index matches and focusMode is "suggestion"', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedSuggestionIndex(1);
        });

        expect(result.current.isSuggestionFocused(1)).toBe(true);
      });

      it('should return false when index does not match', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedSuggestionIndex(1);
        });

        expect(result.current.isSuggestionFocused(0)).toBe(false);
        expect(result.current.isSuggestionFocused(2)).toBe(false);
      });

      it('should return false when focusMode is not "suggestion"', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusedSuggestionIndex(1);
          result.current.setFocusMode('language');
        });

        expect(result.current.isSuggestionFocused(1)).toBe(false);
      });

      it('should return false when focusedSuggestionIndex is null', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
        });

        expect(result.current.isSuggestionFocused(0)).toBe(false);
      });

      it('should correctly identify index 0 as focused', () => {
        const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

        act(() => {
          result.current.setFocusMode('suggestion');
          result.current.setFocusedSuggestionIndex(0);
        });

        expect(result.current.isSuggestionFocused(0)).toBe(true);
        expect(result.current.isSuggestionFocused(1)).toBe(false);
      });
    });
  });

  describe('setFocusedKeyIndex (no-op behavior)', () => {
    it('should be a function (no-op for derived state)', () => {
      const { result } = renderHook(() => useKeyboardNavigation(createDefaultOptions()));

      expect(typeof result.current.setFocusedKeyIndex).toBe('function');

      // Calling it should not throw
      act(() => {
        result.current.setFocusedKeyIndex(2);
      });

      // focusedKeyIndex is derived from selectedKeyId, not from this setter
      // So it should still be null (no selectedKeyId)
      expect(result.current.focusedKeyIndex).toBeNull();
    });
  });
});
